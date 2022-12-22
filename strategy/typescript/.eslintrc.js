module.exports = {
    "env": {
        "es6": true
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "plugins": [
        "eslint-plugin-no-null",
        "eslint-plugin-jsdoc",
        "eslint-plugin-import",
        "eslint-plugin-unicorn",
        "eslint-plugin-sonarjs",
        "eslint-plugin-erforce",
        "@typescript-eslint",
    ],
    "root": true,
    "rules": {
        "@typescript-eslint/adjacent-overload-signatures": "error",
        "@typescript-eslint/ban-types": [
            "error",
            {
                "types": {
                    "Boolean": {
                        "message": "Avoid using the 'Boolean' type. Did you mean 'boolean'?"
                    },
                    "Number": {
                        "message": "Avoid using the 'Number' type. Did you mean 'number'?"
                    },
                    "String": {
                        "message": "Avoid using the 'String' type. Did you mean 'string'?"
                    },
                    "Symbol": {
                        "message": "Avoid using the 'Symbol' type. Did you mean 'symbol'?"
                    },
                    "Function": false,
                    "Object": false
                }
            }
        ],
        // for issues with this see: https://github.com/typescript-eslint/typescript-eslint/issues/1824
        "@typescript-eslint/indent": [
            "error",
            "tab",
            {
                "CallExpression": {
                    "arguments": "off"
                },
                "FunctionDeclaration": {
                    "parameters": 2
                },
                "FunctionExpression": {
                    "parameters": 2
                },
                "SwitchCase": 1,
                // these nodes are ignored, because the rules can not be configured in a way, that we are
                // happy with yet, see above issue
                "ignoredNodes": [
                    "ConditionalExpression",
                    "TSUnionType",
                    "TSFunctionType",
                    "TSDeclareFunction",

                    // this ignores cases where the return type is in the next line,
                    // because @typescript-eslint/indent can't handle these correctly
                    // the selector syntax x > y means every y that has x as a direct
                    // parent in the AST
                    "FunctionDeclaration > TSArrayType",
                    "FunctionDeclaration > TSConditionalType",
                    "FunctionDeclaration > TSConstructorType",
                    "FunctionDeclaration > TSIntersectionType",
                    "FunctionDeclaration > TSMappedType",
                    "FunctionDeclaration > TSLiteralType",
                    "FunctionDeclaration > TSRestType",
                    "FunctionDeclaration > TSThisType",
                    "FunctionDeclaration > TSTupleType",
                    "FunctionDeclaration > TSTypeAnnotation",
                    "FunctionDeclaration > TSTypeReference",
              ]
            }
        ],
        "@typescript-eslint/member-delimiter-style": [
            "error",
            {
                "multiline": {
                    "delimiter": "semi",
                    "requireLast": true
                },
                "singleline": {
                    "delimiter": "semi",
                    "requireLast": false
                }
            }
        ],
        "@typescript-eslint/naming-convention": [
            "error",
            {
                "selector": "variable",
                "format": ["camelCase", "snake_case"],
                "leadingUnderscore": "allow",
            },
            {
                "selector": "variable",
                "format": ["camelCase", "snake_case", "UPPER_CASE"],
                "modifiers": ["const"],
                "leadingUnderscore": "allow",
            },

            {
                "selector": "function",
                "format": ["camelCase", "snake_case"],
                "leadingUnderscore": "allow",
            },

            {
                "selector": "parameter",
                "format": ["camelCase", "snake_case"],
                "leadingUnderscore": "allow",
            },

            {
                "selector": "classProperty",
                "format": ["camelCase", "snake_case"],
                "leadingUnderscore": "allow",
            },
            {
                "selector": "classProperty",
                "format": ["UPPER_CASE"],
                "modifiers": ["static", "readonly"],
                "leadingUnderscore": "allow",
            },
            {
                "selector": "classProperty",
                "format": ["camelCase", "snake_case"],
                "modifiers": ["static"],
                "leadingUnderscore": "allow",
            },
            {
                "selector": "classProperty",
                "format": ["camelCase", "UPPER_CASE"],
                "modifiers": ["readonly"],
                "leadingUnderscore": "allow",
            },

            {
                "selector": "objectLiteralProperty",
                "format": null,
                "leadingUnderscore": "allow",
            },

            {
                "selector": "typeProperty",
                "format": ["camelCase", "snake_case"],
                "leadingUnderscore": "allow",
            },

            {
                "selector": "parameterProperty",
                "format": ["camelCase"],
            },

            {
                "selector": "classMethod",
                "format": ["camelCase", "snake_case"],
                "leadingUnderscore": "allow",
            },

            {
                "selector": "objectLiteralMethod",
                "format": ["camelCase"],
            },

            {
                "selector": "typeMethod",
                "format": ["camelCase"],
            },

            {
                "selector": "accessor",
                "format": ["camelCase"],
                "leadingUnderscore": "allow",
            },

            {
                "selector": "enumMember",
                "format": ["camelCase", "PascalCase", "UPPER_CASE"],
            },

            {
                "selector": "class",
                "format": ["PascalCase"],
            },

            {
                "selector": "interface",
                "format": ["PascalCase"],
            },

            {
                "selector": "typeAlias",
                "format": ["PascalCase"],
            },

            {
                "selector": "enum",
                "format": ["PascalCase"],
            },

            {
                "selector": "typeParameter",
                "format": ["PascalCase"],
            },
        ],
        "@typescript-eslint/no-misused-new": "error",
        "@typescript-eslint/no-parameter-properties": "error",
        "@typescript-eslint/no-require-imports": "error",
        "@typescript-eslint/no-this-alias": "error",
        "@typescript-eslint/prefer-function-type": "error",
        "@typescript-eslint/quotes": [
            "error",
            "double",
            {
                "avoidEscape": true
            }
        ],
        "@typescript-eslint/semi": [
            "error",
            "always"
        ],
        "arrow-body-style": "off",
        "arrow-parens": [
            "error",
            "always"
        ],
        "brace-style": [
            "error",
            "1tbs",
            {
                "allowSingleLine": true
            }
        ],
        "constructor-super": "error",
        "curly": [
            "error",
            "multi-line"
        ],
        "eol-last": "error",
        "import/order": [
            "error",
            {
                "newlines-between": "always",
                "pathGroups": [
                    {
                        "pattern": "base/**",
                        "group": "parent",
                        "position": "before",
                    },
                    {
                        "pattern": "glados/**",
                        "group": "sibling",
                        "position": "after",
                    },
                ],
                "pathGroupsExcludedImportTypes": ["parent", "sibling"],
                "warnOnUnassignedImports": true,
                "alphabetize": {
                    "order": "asc",
                }
            }
        ],
        "jsdoc/check-alignment": "error",
        "jsdoc/check-indentation": "off",
        "jsdoc/newline-after-description": "off",
        "linebreak-style": [
            "error",
            "unix"
        ],
        "new-parens": "error",
        "no-bitwise": "warn",
        "no-console": [
            "error",
            {
                "allow": [
                    "warn",
                    "dir",
                    "time",
                    "timeEnd",
                    "timeLog",
                    "trace",
                    "assert",
                    "clear",
                    "count",
                    "countReset",
                    "group",
                    "groupEnd",
                    "table",
                    "debug",
                    "info",
                    "dirxml",
                    "groupCollapsed",
                    "Console",
                    "profile",
                    "profileEnd",
                    "timeStamp",
                    "context",
                    "createTask"
                ]
            }
        ],
        "no-debugger": "error",
        "no-duplicate-case": "error",
        "no-duplicate-imports": "error",
        "no-empty": [
            "error",
            {
                "allowEmptyCatch": true
            }
        ],
        "no-eval": "error",
        "no-invalid-this": "error",
        "no-new-wrappers": "error",
        "no-null/no-null": "error",
        "no-redeclare": "off",
        "@typescript-eslint/no-redeclare": [
            "error",
            {
                "ignoreDeclarationMerge": true
            }
        ],
        "no-return-await": "error",
        "eqeqeq": "off",
        // this is a workaround, because eqeqeq does not allow making undefined an exception
        "no-restricted-syntax": [
            "error",
            {
                "selector": "BinaryExpression[operator='=='][left.name!='undefined'][right.name!='undefined']",
                "message": "Comparison with == is only allowed when comparing with undefined, because JavaScript is cursed. Use === instead."
            },
            {
                "selector": "BinaryExpression[operator='!='][left.name!='undefined'][right.name!='undefined']",
                "message": "Comparison with != is only allowed when comparing with undefined, because JavaScript is cursed. Use !== instead."
            },
        ],
        "no-sparse-arrays": "error",
        "no-template-curly-in-string": "error",
        "no-throw-literal": "error",
        "no-trailing-spaces": "error",
        "no-unused-labels": "error",
        "no-var": "error",
        "prefer-object-spread": "error",
        "prefer-template": "error",
        "quote-props": [
            "error",
            "consistent"
        ],
        "radix": "error",

        // turned off because there are overriding @typescript versions
        "quotes": "off",
        "semi": "off",
        "indent": "off",

        "space-before-function-paren": "off",
        "@typescript-eslint/space-before-function-paren": [
            "error",
            "never"
        ],
        "space-in-parens": [
            "error",
            "never"
        ],
        "space-before-blocks": "off",
        "@typescript-eslint/space-before-blocks": "error",
        "keyword-spacing": "off",
        "@typescript-eslint/keyword-spacing": "error",

        "arrow-spacing": "error",
        "block-spacing": "error",
        "func-call-spacing": "off",
        "@typescript-eslint/func-call-spacing": "error",
        "key-spacing": "error",
        "switch-colon-spacing": "error",
        "template-curly-spacing": "error",
        "rest-spread-spacing": "error",
        "quotes": [
            "error",
            "double",
        ],
        "@typescript-eslint/space-infix-ops": "error",
        "comma-spacing": "off",
        "@typescript-eslint/comma-spacing": "error",
        "semi-spacing": "error",
        "no-multi-spaces": "error",
        "space-unary-ops": [
            "error",
            {
                "words": true,
                "nonwords": false,
                "overrides": {
                    "typeof": false,
                }
            }
        ],
        "@typescript-eslint/type-annotation-spacing": "error",
        "array-bracket-spacing": [
            "error",
            "never",
        ],
        "object-curly-spacing": "off",
        "@typescript-eslint/object-curly-spacing": [
            "error",
            "always",
        ],

        "new-parens": "error",
        "linebreak-style": [
            "error",
            "unix",
        ],

        "spaced-comment": [
            "error",
            "always",
            {
                "line": {
                    "markers": [
                        "/"
                    ]
                },
                "block": {
                    "balanced": true,
                    "exceptions": ["*"],
                    "markers": [
                        "*"
                    ]
                }
            }
        ],
        "unicorn/prefer-switch": [
            "error",
            {
                "minimumCases": 5
            }
        ],
        "use-isnan": "error",

        "sonarjs/prefer-while": "error",
        "sonarjs/no-all-duplicated-branches": "error",
        "sonarjs/no-element-overwrite": "error",
        "sonarjs/no-empty-collection": "error",
        "sonarjs/no-extra-arguments": "error",
        "sonarjs/no-identical-conditions": "error",
        "sonarjs/no-identical-expressions": "error",
        "sonarjs/no-ignored-return": "error",
        "sonarjs/no-one-iteration-loop": "error",
        "sonarjs/no-use-of-empty-return-value": "error",
        "sonarjs/non-existent-operator": "error",
        "sonarjs/no-collapsible-if": "error",
        "sonarjs/no-collection-size-mischeck": "error",
        "sonarjs/no-duplicated-branches": "error",
        "sonarjs/no-gratuitous-expressions": "error",
        "sonarjs/no-identical-functions": "error",
        "sonarjs/no-redundant-boolean": "error",
        "sonarjs/no-redundant-jump": "error",
        "sonarjs/no-same-line-conditional": "error",
        "sonarjs/no-unused-collection": "error",

        "erforce/no-unnecessary-function-wrapper": "error",
        "erforce/check-typecast-spacing": "error",
    }
};
