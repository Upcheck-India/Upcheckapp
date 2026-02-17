#!/bin/bash
mkdir -p secrets
openssl genpkey -algorithm RSA -out secrets/private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in secrets/private.pem -out secrets/public.pem
echo "Keys generated in secrets/ directory"
