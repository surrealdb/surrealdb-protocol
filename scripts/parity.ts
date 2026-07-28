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
 * proto `oneof`s against flatbuffers `union`s -- by member name and number.
 * Those are where drift actually happened, and where it costs the most: a
 * variant present in one encoding and not the other is a value that cannot
 * round-trip.
 *
 * Accepted differences live in parity.toml with a written reason.
 *
 * Run: bun run scripts/parity.ts   (regenerates the descriptor set first)
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DESCRIPTOR = "build/descriptor.json";
const FBS = "surrealdb/protocol/v1/value.fbs";
const ALLOW = "parity.toml";

interface Member {
	name: string;
	number: number;
}

/** Pairs of (proto oneof, flatbuffers union) that must agree. */
const PAIRS: Array<{ proto: string; oneof: string; fb: string }> = [
	{ proto: "Value", oneof: "value", fb: "ValueType" },
	{ proto: "RecordIdKey", oneof: "id", fb: "RecordIdKeyType" },
];

/** Reads the accepted-divergence list: `Union.Member = "reason"`. */
function readAllowlist(): Map<string, string> {
	const allowed = new Map<string, string>();
	let source: string;
	try {
		source = readFileSync(ALLOW, "utf8");
	} catch {
		return allowed;
	}
	for (const line of source.split("\n")) {
		const match = line.match(/^\s*"?([\w.]+)"?\s*=\s*"(.*)"\s*$/);
		if (match?.[1] && match[2]) allowed.set(match[1], match[2]);
	}
	return allowed;
}

/** Extracts a proto oneof's members from the descriptor set. */
function protoOneof(descriptor: any, message: string, oneof: string): Member[] {
	for (const file of descriptor.file ?? []) {
		for (const type of file.messageType ?? []) {
			if (type.name !== message) continue;
			const index = (type.oneofDecl ?? []).findIndex(
				(d: any) => d.name === oneof,
			);
			if (index < 0) continue;
			return (type.field ?? [])
				.filter((f: any) => f.oneofIndex === index)
				.map((f: any) => ({ name: pascal(f.name), number: f.number }));
		}
	}
	throw new Error(`proto ${message}.${oneof} not found in ${DESCRIPTOR}`);
}

/**
 * Extracts a flatbuffers union's members by parsing the schema text.
 *
 * Parsed rather than read from `flatc --bfbs` reflection because that needs a
 * second toolchain round trip to become readable, and a union declaration is
 * a handful of lines of unambiguous syntax. Members are `Name: Type (id: N)`
 * or, when the member type doubles as its name, `Name (id: N)`.
 */
function fbUnion(source: string, name: string): Member[] {
	const block = source.match(
		new RegExp(`union\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`),
	);
	if (!block?.[1]) throw new Error(`flatbuffers union ${name} not found`);

	const members: Member[] = [];
	for (const line of block[1].split("\n")) {
		const stripped = line.replace(/\/\/.*$/, "").trim();
		if (!stripped) continue;
		const match = stripped.match(/^(\w+)\s*(?::\s*[\w.]+)?\s*\(id:\s*(\d+)\)/);
		if (match?.[1] && match[2]) {
			members.push({ name: match[1], number: Number(match[2]) });
		}
	}
	if (members.length === 0) throw new Error(`union ${name} parsed as empty`);
	return members;
}

/** proto field names are snake_case; flatbuffers members are PascalCase. */
function pascal(name: string): string {
	return name
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
}

function main(): void {
	execFileSync("buf", ["build", "-o", DESCRIPTOR], { stdio: "inherit" });

	const descriptor = JSON.parse(readFileSync(DESCRIPTOR, "utf8"));
	const fbs = readFileSync(FBS, "utf8");
	const allowed = readAllowlist();
	const problems: string[] = [];

	for (const pair of PAIRS) {
		const left = protoOneof(descriptor, pair.proto, pair.oneof);
		const right = fbUnion(fbs, pair.fb);
		const label = `${pair.proto}.${pair.oneof} <-> ${pair.fb}`;

		const byNumber = new Map(right.map((m) => [m.number, m]));
		const fbNames = new Set(right.map((m) => m.name.toLowerCase()));

		for (const member of left) {
			const key = `${pair.fb}.${member.name}`;
			if (allowed.has(key)) continue;

			const counterpart = byNumber.get(member.number);
			if (!counterpart) {
				problems.push(
					`${label}: proto has ${member.name} = ${member.number}, flatbuffers has no member with that id`,
				);
				continue;
			}
			if (counterpart.name.toLowerCase() !== member.name.toLowerCase()) {
				problems.push(
					`${label}: id ${member.number} is ${member.name} in proto but ${counterpart.name} in flatbuffers`,
				);
			}
		}

		for (const member of right) {
			const key = `${pair.fb}.${member.name}`;
			if (allowed.has(key)) continue;
			if (!left.some((m) => m.number === member.number)) {
				problems.push(
					`${label}: flatbuffers has ${member.name} = ${member.number}, proto has no field with that tag`,
				);
			}
		}

		// Surfaced separately: a name-only mismatch is a readability problem,
		// an id mismatch is a correctness one.
		for (const member of left) {
			if (allowed.has(`${pair.fb}.${member.name}`)) continue;
			if (!fbNames.has(member.name.toLowerCase())) {
				problems.push(
					`${label}: proto member ${member.name} has no same-named flatbuffers member`,
				);
			}
		}
	}

	if (problems.length > 0) {
		console.error("proto <-> flatbuffers parity failed:\n");
		for (const problem of [...new Set(problems)]) console.error(`  - ${problem}`);
		console.error(
			`\nFix the schemas, or record the difference in ${ALLOW} with a reason.`,
		);
		process.exit(1);
	}

	console.log(
		`proto <-> flatbuffers parity OK (${PAIRS.length} unions, ${allowed.size} accepted differences)`,
	);
}

main();
