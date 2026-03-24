__PROJECT=buzzing-archive
__TYPE=compose-build

# AWS S3 credentials for buzzing archive
# Note: Uses /buzzing/ prefix (same for dev and prod)
# psenv will auto-fetch from Parameter Store using -p /buzzing/ prefix

BUZZING_AWS_ACCESS_KEY_ID=
BUZZING_AWS_DEFAULT_REGION=
BUZZING_AWS_ENDPOINT=
BUZZING_AWS_SECRET_ACCESS_KEY=

AWS_ACCESS_KEY_ID=${BUZZING_AWS_ACCESS_KEY_ID}
AWS_DEFAULT_REGION=${BUZZING_AWS_DEFAULT_REGION}
AWS_ENDPOINT=${BUZZING_AWS_ENDPOINT}
AWS_SECRET_ACCESS_KEY=${BUZZING_AWS_SECRET_ACCESS_KEY}


PUBLIC_URL=https://i${CTX_DNS_SUFFIX:-}.${CTX_ROOT_DOMAIN:-localtest.me}
