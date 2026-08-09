import { describe, expect, test } from "bun:test";
import { DateTime, Duration } from "../../src/index.ts";

describe("DateTime", () => {
    test("constructor with Date object", () => {
        const date = new Date("2023-12-25T10:30:00.123Z");
        const dt = new DateTime(date);
        expect(dt.toISOString()).toBe("2023-12-25T10:30:00.123Z");
    });

    test("constructor with ISO string", () => {
        const dt = new DateTime("2023-12-25T10:30:00.456Z");
        expect(dt.toISOString()).toBe("2023-12-25T10:30:00.456Z");
    });

    test("constructor with seconds", () => {
        const dt = DateTime.fromEpochSeconds(1703500200); // 2023-12-25T10:30:00Z
        expect(dt.toISOString()).toBe("2023-12-25T10:30:00.000Z");
    });

    test("constructor with bigint seconds", () => {
        const dt = new DateTime(1703500200n); // 2023-12-25T10:30:00Z
        expect(dt.toISOString()).toBe("2023-12-25T10:30:00.000Z");
    });

    test("constructor with milliseconds", () => {
        const dt = DateTime.fromEpochMilliseconds(1703500200123); // 2023-12-25T10:30:00.123Z
        expect(dt.toISOString()).toBe("2023-12-25T10:30:00.123Z");
    });

    test("constructor with nanoseconds", () => {
        const dt = DateTime.fromEpochNanoseconds(1703500200000000123n); // 2023-12-25T10:30:00.000000123Z
        expect(dt.toISOString()).toBe("2023-12-25T10:30:00.000000123Z");
    });

    test("constructor with tuple notation", () => {
        const dt = new DateTime([1703500200n, 123000000n]);
        expect(dt.toISOString()).toBe("2023-12-25T10:30:00.123Z");
    });

    test("epoch static method", () => {
        const epoch = DateTime.epoch();
        expect(epoch.toISOString()).toBe("1970-01-01T00:00:00.000Z");
    });

    test("toDate method", () => {
        const originalDate = new Date("2023-12-25T10:30:00.123Z");
        const dt = new DateTime(originalDate);
        const convertedDate = dt.toDate();
        expect(convertedDate.getTime()).toBe(originalDate.getTime());
    });

    test("toCompact method", () => {
        const dt = new DateTime("2023-12-25T10:30:00.123Z");
        const compact = dt.toCompact();
        expect(compact).toEqual([1703500200n, 123000000n]);
    });

    test("toCompact method with zero", () => {
        const dt = new DateTime(0);
        const compact = dt.toCompact();
        expect(compact.length).toEqual(2);
    });

    test("equals method", () => {
        const dt1 = new DateTime("2023-12-25T10:30:00.123Z");
        const dt2 = new DateTime("2023-12-25T10:30:00.123Z");
        const dt3 = new DateTime("2023-12-25T10:30:00.456Z");

        expect(dt1.equals(dt2)).toBe(true);
        expect(dt1.equals(dt3)).toBe(false);
        expect(dt1.equals("not a datetime")).toBe(false);
    });

    test("add duration", () => {
        const dt = new DateTime("2023-12-25T10:30:00.000Z");
        const duration = Duration.hours(2);
        const result = dt.add(duration);
        expect(result.toISOString()).toBe("2023-12-25T12:30:00.000Z");
    });

    test("sub duration", () => {
        const dt = new DateTime("2023-12-25T10:30:00.000Z");
        const duration = Duration.hours(2);
        const result = dt.sub(duration);
        expect(result.toISOString()).toBe("2023-12-25T08:30:00.000Z");
    });

    test("diff between datetimes", () => {
        const dt1 = new DateTime("2023-12-25T10:30:00.000Z");
        const dt2 = new DateTime("2023-12-25T12:30:00.000Z");
        const diff = dt2.diff(dt1);
        expect(diff.nanoseconds).toBe(7200000000000n); // 2 hours in nanoseconds
        expect(diff.toString()).toBe("2h"); // Should format as 2 hours
    });

    test("nanoseconds getter", () => {
        const dt = new DateTime("2023-12-25T10:30:00.123Z");
        const expected = 1703500200n * 1000000000n + 123000000n;
        expect(dt.nanoseconds).toBe(expected);
    });

    test("microseconds getter", () => {
        const dt = new DateTime("2023-12-25T10:30:00.123Z");
        const expected = (1703500200n * 1000000000n + 123000000n) / 1000n;
        expect(dt.microseconds).toBe(expected);
    });

    test("milliseconds getter", () => {
        const dt = new DateTime("2023-12-25T10:30:00.123Z");
        const expected = (1703500200 * 1000000000 + 123000000) / 1000000;
        expect(dt.milliseconds).toBe(expected);
    });

    test("seconds getter", () => {
        const dt = new DateTime("2023-12-25T10:30:00.123Z");
        expect(dt.seconds).toBe(1703500200);
    });

    test("nanosecondsPart from toCompact", () => {
        const dt = new DateTime("2023-12-25T10:30:00.123Z");
        const compact = dt.toCompact();
        expect(compact[1]).toBe(123000000n); // nanoseconds part from compact
    });

    test("toJSON method", () => {
        const dt = new DateTime("2023-12-25T10:30:00.123Z");
        expect(dt.toJSON()).toBe("2023-12-25T10:30:00.123Z");
    });

    test("toString method", () => {
        const dt = new DateTime("2023-12-25T10:30:00.123Z");
        expect(dt.toString()).toBe("2023-12-25T10:30:00.123Z");
    });

    test("parseString with invalid format", () => {
        expect(() => {
            DateTime.parseString("invalid datetime");
        }).toThrow("Invalid datetime format: invalid datetime");
    });

    // What actually keeps toISOString's trailing-zero trim cheap: every path
    // that sets the nanoseconds field bounds it below one second, so the
    // string it trims is always the nine characters padStart guarantees.
    // A fraction longer than nine digits does not reach that field at all.
    test("nanoseconds stays below one second whatever the fraction", () => {
        // The ISO branch caps its fraction group at \d{1,9}.
        expect(DateTime.parseString("2023-12-25T10:30:00.123456789Z")[1]).toBe(123456789n);

        // A longer fraction fails that regex and falls through to Date.parse,
        // which keeps millisecond precision.
        const [, ns] = DateTime.parseString(`2023-12-25T10:30:00.${"1".repeat(40)}Z`);
        expect(ns).toBeLessThan(1_000_000_000n);

        // The tuple branch takes a remainder rather than trusting the caller.
        expect(new DateTime([0n, 2_500_000_000n]).toISOString()).toBe("1970-01-01T00:00:02.5Z");
    });

    test("trailing zeros are trimmed exactly as before", () => {
        // 123456000ns keeps six digits; 000000123ns keeps nine.
        expect(new DateTime([0n, 123456000n]).toISOString()).toBe("1970-01-01T00:00:00.123456Z");
        expect(new DateTime([0n, 123n]).toISOString()).toBe("1970-01-01T00:00:00.000000123Z");
    });
});
