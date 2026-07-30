/**
 * Checks that value.proto and value.fbs stay in sync.
 *
 * Both schemas are load-bearing and both are live: the .proto is the gRPC
 * contract and the only IDL with a C backend, while the .fbs is the wire
 * format the Rust SDK's WebSocket and HTTP engines already negotiate and the
 * server's `application/vnd.surrealdb.flatbuffers` content type. Neither can
 * be dropped, so they have to be kept honest mechanically. Letting them drift
 * by hand is what produced eight structural divergences and two silent
 * data-loss bugs.
 *
 * Compares the discriminated unions that carry SurrealDB's type system --
 * proto `oneof`s against flatbuffers `union`s -- by member id and name. Those
 * are where drift actually happened, and where it costs the most: a variant
 * present in one encoding and not the other is a value that cannot round-trip.
 *
 * The pairs are DISCOVERED, not listed. Every flatbuffers union must resolve
 * to a proto oneof and vice versa, so adding a union to either schema without
 * its counterpart fails here rather than going quietly unguarded.
 *
 * Accepted differences live in parity.toml with a written reason.
 *
 * Run: bun run scripts/parity.ts
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

const DESCRIPTOR = "build/descriptor.json";
const FBS = "surrealdb/protocol/v1/value.fbs";
const PROTO = "surrealdb/protocol/v1/value.proto";
const ALLOW = "parity.toml";

interface Member {
	name: string;
	number: number;
}

/** The slice of google.protobuf.FileDescriptorSet this check reads. */
interface FieldDescriptor {
	name: string;
	number: number;
	oneofIndex?: number;
}
interface MessageDescriptor {
	name: string;
	field?: FieldDescriptor[];
	oneofDecl?: Array<{ name: string }>;
}
interface DescriptorSet {
	file?: Array<{ name?: string; messageType?: MessageDescriptor[] }>;
}

/**
 * Flatbuffers unions whose proto counterpart the naming convention cannot
 * derive. Everything else resolves as `<Name>Type -> <Name>` or `<Name> ->
 * <Name>`; only genuine exceptions belong here.
 */
const UNION_TO_MESSAGE: Record<string, string> = {
	LiteralType: "LiteralKind",
};

/**
 * Every `union X { ... }` in the flatbuffers schema, with its members.
 *
 * The number recorded is the tag flatc actually emits, which is the member's
 * declaration slot counting from 1 -- slot 0 is the implicit NONE sentinel --
 * with an explicit `= N` setting the tag and the count continuing from there.
 *
 * It is deliberately NOT read from `(id: N)`. flatc accepts that attribute on
 * union members and then ignores it, so a schema can annotate `(id: 13)` on the
 * member it tags 12 and nothing complains: `KindType` in this very schema does
 * exactly that, because its annotations leave a gap at 12 that the wire format
 * does not have. Trusting the attribute made this check compare a comment
 * against the proto while the bytes went unread, which is how a reordered
 * member -- the one edit that silently reinterprets every existing value --
 * slipped through it.
 */
function fbUnions(source: string): Map<string, Member[]> {
	const unions = new Map<string, Member[]>();
	const pattern = /union\s+(\w+)\s*\{([\s\S]*?)\n\}/g;

	for (const [, name, body] of source.matchAll(pattern)) {
		if (!name || !body) continue;
		const members: Member[] = [];
		let next = 1;
		for (const line of body.split("\n")) {
			const stripped = line.replace(/\/\/.*$/, "").trim();
			if (!stripped) continue;
			// `Name: Type`, or `Name` when the member type doubles as its name,
			// then an optional `= N`, then optional attributes.
			const match = stripped.match(
				/^(\w+)\s*(?::\s*[\w.]+)?\s*(?:=\s*(\d+))?\s*(?:\([^)]*\))?\s*,?$/,
			);
			if (!match?.[1]) continue;
			const number = match[2] === undefined ? next : Number(match[2]);
			members.push({ name: match[1], number });
			next = number + 1;
		}
		if (members.length > 0) unions.set(name, members);
	}
	return unions;
}

/**
 * Every `oneof` in value.proto, keyed `Message.oneof`, with its members.
 *
 * Scoped to that one file because the flatbuffers schema only models the value
 * type system. The RPC layer's oneofs (frame envelopes, credentials, and so
 * on) have no flatbuffers counterpart by design, and pairing them would be
 * noise rather than a finding.
 */
function protoOneofs(descriptor: DescriptorSet): Map<string, Member[]> {
	const oneofs = new Map<string, Member[]>();
	for (const file of descriptor.file ?? []) {
		if (file.name !== PROTO) continue;
		for (const type of file.messageType ?? []) {
			(type.oneofDecl ?? []).forEach((decl, index) => {
				const members = (type.field ?? [])
					.filter((f) => f.oneofIndex === index)
					.map((f) => ({ name: pascal(f.name), number: f.number }));
				if (members.length > 0) {
					oneofs.set(`${type.name}.${decl.name}`, members);
				}
			});
		}
	}
	return oneofs;
}

/** proto field names are snake_case; flatbuffers members are PascalCase. */
function pascal(name: string): string {
	return name
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
}

/** Reads the accepted-divergence list from the `[allow]` table. */
function readAllowlist(): Map<string, string> {
	let source: string;
	try {
		source = readFileSync(ALLOW, "utf8");
	} catch {
		return new Map();
	}
	// Bun parses TOML natively. A line-regex would match `key = "value"` under
	// any table, so an entry that drifted out of `[allow]` would still silently
	// suppress a parity error -- in the one file whose whole job is to make
	// suppression deliberate.
	const parsed = Bun.TOML.parse(source) as { allow?: Record<string, string> };
	return new Map(Object.entries(parsed.allow ?? {}));
}

/**
 * A union whose flatbuffers tags sit at a fixed distance from their proto
 * counterparts, rather than matching them.
 *
 * The alternative for a uniformly shifted union is `<Union>.*.id`, which turns
 * the id check off outright and takes the name check down with it, since names
 * are only compared once a counterpart has been found by id. A declared offset
 * keeps both checks running against the shifted position, so a rename, a
 * dropped member, or a second reordering still fails.
 */
interface Offset {
	/** Added to a proto tag to get its flatbuffers tag. */
	by: number;
	/** Members that do not follow the offset and are checked by name only. */
	except: string[];
	reason: string;
}

/** Reads the declared tag offsets from the `[offset]` table. */
function readOffsets(): Map<string, Offset> {
	let source: string;
	try {
		source = readFileSync(ALLOW, "utf8");
	} catch {
		return new Map();
	}
	const parsed = Bun.TOML.parse(source) as {
		offset?: Record<string, Partial<Offset>>;
	};
	const offsets = new Map<string, Offset>();
	for (const [union, spec] of Object.entries(parsed.offset ?? {})) {
		if (typeof spec?.by !== "number" || !spec.reason) {
			throw new Error(
				`${ALLOW}: [offset] ${union} needs both a numeric \`by\` and a \`reason\``,
			);
		}
		offsets.set(union, {
			by: spec.by,
			except: spec.except ?? [],
			reason: spec.reason,
		});
	}
	return offsets;
}

function main(): void {
	// buf does not create parent directories, and build/ is gitignored, so it
	// is absent on a fresh checkout -- which is every CI run.
	mkdirSync(dirname(DESCRIPTOR), { recursive: true });
	execFileSync("buf", ["build", "-o", DESCRIPTOR], { stdio: "inherit" });

	const descriptor: DescriptorSet = JSON.parse(
		readFileSync(DESCRIPTOR, "utf8"),
	);
	const unions = fbUnions(readFileSync(FBS, "utf8"));
	const oneofs = protoOneofs(descriptor);
	const allowed = readAllowlist();
	const offsets = readOffsets();
	const problems: string[] = [];

	// Allowlist keys, narrowest first:
	//   <Union>.<Member>.<id|name>   one member, one kind of check
	//   <Union>.*.<id|name>          every member, one kind of check
	//   <Union>.*                    the whole union
	//
	// Splitting id from name is what stops "these two are spelled differently"
	// from also switching off renumbering detection, which is the check that
	// actually catches a value failing to round-trip.
	const excused = (union: string, member: string, check: "id" | "name") =>
		allowed.has(`${union}.${member}.${check}`) ||
		allowed.has(`${union}.*.${check}`) ||
		allowed.has(`${union}.*`);

	const unpaired = new Set(oneofs.keys());
	let checked = 0;

	for (const [union, fbMembers] of unions) {
		const message = UNION_TO_MESSAGE[union] ?? union.replace(/Type$/, "");
		// Every message in these schemas carries at most one oneof, so the
		// message name is enough to find it.
		const key = [...oneofs.keys()].find((k) => k.startsWith(`${message}.`));
		if (!key) {
			problems.push(
				`flatbuffers union ${union} has no proto counterpart (looked for a oneof on message ${message})`,
			);
			continue;
		}
		unpaired.delete(key);
		checked += 1;

		const protoMembers = oneofs.get(key) ?? [];
		const byNumber = new Map(fbMembers.map((m) => [m.number, m]));

		// A declared offset shifts where a proto member's counterpart is looked
		// for, so the id and name checks keep running instead of being switched
		// off wholesale. Members named in `except` are checked by name only.
		const offset = offsets.get(union);
		const shift = offset?.by ?? 0;
		const offsetExempt = new Set(
			(offset?.except ?? []).map((name) => name.toLowerCase()),
		);
		const label = offset
			? `${key} <-> ${union} (offset ${shift >= 0 ? "+" : ""}${shift})`
			: `${key} <-> ${union}`;

		for (const member of protoMembers) {
			if (offsetExempt.has(member.name.toLowerCase())) {
				// Off the offset, so its tag says nothing. Still require that the
				// member exists on the other side, or a variant could go missing
				// under cover of the exemption.
				if (
					!fbMembers.some(
						(m) => m.name.toLowerCase() === member.name.toLowerCase(),
					) &&
					!excused(union, member.name, "id")
				) {
					problems.push(
						`${label}: proto has ${member.name} = ${member.number}, exempt from the offset, and flatbuffers has no member of that name`,
					);
				}
				continue;
			}
			const counterpart = byNumber.get(member.number + shift);
			if (!counterpart) {
				if (!excused(union, member.name, "id")) {
					problems.push(
						`${label}: proto has ${member.name} = ${member.number}, flatbuffers has no member with id ${member.number + shift}`,
					);
				}
				continue;
			}
			if (
				counterpart.name.toLowerCase() !== member.name.toLowerCase() &&
				!excused(union, member.name, "name")
			) {
				problems.push(
					`${label}: proto ${member.name} = ${member.number} should pair with flatbuffers id ${member.number + shift}, which is ${counterpart.name}`,
				);
			}
		}

		for (const member of fbMembers) {
			if (offsetExempt.has(member.name.toLowerCase())) continue;
			if (protoMembers.some((m) => m.number + shift === member.number)) continue;
			if (excused(union, member.name, "id")) continue;
			problems.push(
				`${label}: flatbuffers has ${member.name} = ${member.number}, proto has no field with tag ${member.number - shift}`,
			);
		}
	}

	for (const key of unpaired) {
		problems.push(
			`proto oneof ${key} has no flatbuffers counterpart; add the union or record it in ${ALLOW}`,
		);
	}

	if (problems.length > 0) {
		console.error("proto <-> flatbuffers parity failed:\n");
		for (const problem of problems) console.error(`  - ${problem}`);
		console.error(
			`\nFix the schemas, or record the difference in ${ALLOW} with a reason.`,
		);
		process.exit(1);
	}

	console.log(
		`proto <-> flatbuffers parity OK (${checked} unions, ${allowed.size} accepted differences)`,
	);
}

main();
