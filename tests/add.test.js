"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
test('adds two numbers correctly', () => {
    const result = (0, src_1.add)(2, 3);
    expect(result).toBe(5);
});
