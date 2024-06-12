import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ["**/node_modules/"],
}, ...compat.extends("@steeringwaves/eslint-config"), {
    languageOptions: {
        ecmaVersion: 5,
        sourceType: "script",

        parserOptions: {
            project: "**/tsconfig.json",
        },
    },

    settings: {
        "import/external-module-folders": [],

        "import/resolver": {
            node: {
                extensions: [".js", ".jsx", ".ts", ".tsx", ".vue"],
                moduleDirectory: ["Lib", "node_modules"],
            },
        },
    },
}];