import { pluralize } from "./pluralizer";

describe("pluralize", () => {
    it("pluralizes 'do' and 'does'", () => {
        expect(pluralize("do", 1)).toBe("does");
        expect(pluralize("do", 2)).toBe("do");
        expect(pluralize("does", 2)).toBe("do");
    });
    it("pluralizes regular plurals correctly", () => {
        expect(pluralize("goat", 1)).toBe("goat");
        expect(pluralize("goat", 2)).toBe("goats");
    })
});
