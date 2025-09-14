#!/bin/bash

# Test crash game with properly split coin
echo "Testing crash game with split coin (0.1 SUI)..."

# Create a transaction that splits the coin and uses only 0.1 SUI
cat > crash_test.json << 'EOF'
{
  "inputs": [
    {
      "Pure": {
        "U64": "100000000"
      }
    },
    {
      "Object": {
        "ImmOrOwned": {
          "address": "0x0000000000000000000000000000000000000000000000000000000000000008",
          "version": 385385001,
          "digest": "4qH7vEDP8ormB3MwU4AUcr2GGs8rFUmUv9WfqCjBNZ5i"
        }
      }
    },
    {
      "Object": {
        "Shared": {
          "address": "0x3138461e1f056d46fbf613627d83d9e03bfbf007e3e60fa606c67b80f60c8216",
          "initial_shared_version": 627237527
        }
      }
    },
    {
      "Pure": {
        "U64": "200"
      }
    }
  ],
  "commands": [
    {
      "SplitCoins": {
        "coin": "GasCoin",
        "amounts": [
          "Input(0)"
        ]
      }
    },
    {
      "MoveCall": {
        "package": "0x797e41e2832fec6106cdb590357e0146bd212dc00166c1341822b6cdc005c554",
        "module": "crash",
        "function": "play",
        "arguments": [
          "Input(1)",
          "Input(2)", 
          "Input(3)",
          "NestedResult(0,0)"
        ]
      }
    }
  ]
}
EOF

echo "Transaction file created. Testing..."