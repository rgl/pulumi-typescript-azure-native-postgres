# About

This creates an example [Azure Database for PostgreSQL Flexible Server](https://azure.microsoft.com/en-us/services/postgresql/) instance using the [Pulumi Azure Native provider](https://www.pulumi.com/registry/packages/azure-native).

This will:

* Create a public PostgreSQL instance.
* Configure the PostgresSQL instance to require TLS.
* Enable automated backups.
* Set a random `postgres` account password.
* Show how to connect to the created PostgreSQL instance using `psql`.

For further managing the PostgreSQL instance, you could use:

* The [postgresql Pulumi Package](https://www.pulumi.com/registry/packages/postgresql/).
* The [community.postgresql Ansible Collection](https://galaxy.ansible.com/community/postgresql) as in [rgl/ansible-init-postgres](https://github.com/rgl/ansible-init-postgres).

For equivalent examples see:

* [pulumi google-native](https://github.com/rgl/pulumi-typescript-google-postgres)
* [terraform azurerm](https://github.com/rgl/terraform-azure-postgres)
* [terraform gcp](https://github.com/rgl/terraform-gcp-cloud-sql-postgres)

# Table Of Contents

* [Usage (Ubuntu)](#usage-ubuntu)
* [Usage (Windows)](#usage-windows)
* [Troubleshooting](#troubleshooting)
  * [HTTP proxy](#http-proxy)
* [References](#references)

# Usage (Ubuntu)

Install dependencies:

* `az` (see [my ubuntu ansible azure-client role](https://github.com/rgl/my-ubuntu-ansible-playbooks/tree/main/roles/azure-client))
* `node` (see [my ubuntu ansible nodejs role](https://github.com/rgl/my-ubuntu-ansible-playbooks/tree/main/roles/nodejs))
* `pulumi` (see [my ubuntu ansible pulumi role](https://github.com/rgl/my-ubuntu-ansible-playbooks/tree/main/roles/pulumi))

Install more dependencies:

```bash
sudo apt-get install -y postgresql-client-14
npm ci
```

Login into Azure:

```bash
az login
```

List the subscriptions and select one of them:

```bash
az account list --all
az account set --subscription=<id>
az account show
```

Set the environment:

```bash
cat >secrets.sh <<'EOF'
export PULUMI_SKIP_UPDATE_CHECK='true'
export PULUMI_BACKEND_URL="file://$PWD" # NB pulumi will create the .pulumi sub-directory.
export PULUMI_CONFIG_PASSPHRASE='password'
EOF
```

Provision:

```bash
# login.
source secrets.sh
pulumi login
pulumi whoami -v
# create the dev stack.
pulumi stack init dev
# set the location.
pulumi config set azure-native:location northeurope
# set the zone.
# show the available zones in the given location.
az postgres flexible-server list-skus \
  --location "$(pulumi config get azure-native:location)" \
  | jq -r '.[].supportedServerEditions[].supportedServerSkus[].supportedZones[]' \
  | sort -u
# NB make sure the selected location has this zone available. when its not
#    available, the deployment will fail with InternalServerError.
pulumi config set example:zone 1
# provision.
# NB creating a PostgreSQL Flexible Server is very finicky. it might fail with
#    InternalServerError because there is no capacity in the given region. try
#    modifying the region and sku to see if it helps.
pulumi up
# provision in troubleshooting mode.
# NB for more information see the troubleshooting section in this document.
#pulumi up --logtostderr --logflow -v=9 2>pulumi.log
```

Connect to it:

```bash
# see https://www.postgresql.org/docs/14/libpq-envars.html
# see https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/how-to-connect-tls-ssl
cacerts_url='https://dl.cacerts.digicert.com/DigiCertGlobalRootCA.crt.pem'
cacerts_path="$(basename "$cacerts_url")"
wget "$cacerts_url" -O "$cacerts_path"
export PGSSLMODE='verify-full'
export PGSSLROOTCERT="$cacerts_path"
export PGHOST="$(pulumi stack output fqdn)"
export PGDATABASE='postgres'
export PGUSER='postgres'
export PGPASSWORD="$(pulumi stack output password --show-secrets)"
psql
```

Execute example queries:

```sql
select version();
select current_user;
select case when ssl then concat('YES (', version, ')') else 'NO' end as ssl from pg_stat_ssl where pid=pg_backend_pid();
```

Exit the `psql` session:

```sql
exit
```

Destroy everything:

```bash
pulumi destroy
```

# Usage (Windows)

Install the dependencies:

```powershell
choco install -y azure-cli --version 2.51.0
choco install -y pulumi --version 3.78.1
choco install -y nodejs-lts --version 18.17.1
choco install -y postgresql14 --ia '--enable-components commandlinetools'
Import-Module "$env:ChocolateyInstall\helpers\chocolateyInstaller.psm1"
Update-SessionEnvironment
npm ci
```

Login into Azure:

```bash
az login
```

List the subscriptions and select one of them:

```bash
az account list --all
az account set --subscription=<id>
az account show
```

Set the environment:

```powershell
Set-Content -Encoding ascii secrets.ps1 @'
$env:PULUMI_SKIP_UPDATE_CHECK = 'true'
$env:PULUMI_BACKEND_URL = "file://$($PWD -replace '\\','/')" # NB pulumi will create the .pulumi sub-directory.
$env:PULUMI_CONFIG_PASSPHRASE = 'password'
'@
```

Provision:

```powershell
# login.
. .\secrets.ps1
pulumi login
pulumi whoami -v
# create the dev stack.
pulumi stack init dev
# set the location.
pulumi config set azure-native:location northeurope
# set the zone.
# show the available zones in the given location.
az postgres flexible-server list-skus `
  --location "$(pulumi config get azure-native:location)"
# NB make sure the selected location has this zone available. when its not
#    available, the deployment will fail with InternalServerError.
pulumi config set example:zone 1
# provision.
# NB creating a PostgreSQL Flexible Server is very finicky. it might fail with
#    InternalServerError because there is no capacity in the given region. try
#    modifying the region and sku to see if it helps.
pulumi up
# provision in troubleshooting mode.
# NB for more information see the troubleshooting section in this document.
#pulumi up --logtostderr --logflow -v=9 2>pulumi.log
```

Connect to it:

```powershell
# see https://www.postgresql.org/docs/14/libpq-envars.html
# see https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/how-to-connect-tls-ssl
$cacertsUrl = 'https://dl.cacerts.digicert.com/DigiCertGlobalRootCA.crt.pem'
$cacertsPath = Split-Path -Leaf $cacertsUrl
(New-Object Net.WebClient).DownloadFile($cacertsUrl, $cacertsPath)
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = $cacertsPath
$env:PGHOST = pulumi stack output fqdn
$env:PGDATABASE = 'postgres'
$env:PGUSER = 'postgres'
$env:PGPASSWORD = pulumi stack output password --show-secrets
psql
```

Execute example queries:

```sql
select version();
select current_user;
select case when ssl then concat('YES (', version, ')') else 'NO' end as ssl from pg_stat_ssl where pid=pg_backend_pid();
```

Exit the `psql` session:

```sql
exit
```

Destroy everything:

```powershell
pulumi destroy
```

# Troubleshooting

See the inner-sections for troubleshooting.

For more information see the [Pulumi Troubleshooting](https://www.pulumi.com/docs/support/troubleshooting/) page.

## HTTP proxy

Install an HTTP proxy like [HTTP Toolkit](https://github.com/httptoolkit/httptoolkit-desktop).

Configure the environment to use the http proxy:

```bash
sudo cp ~/Downloads/http-toolkit-ca-certificate.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
export http_proxy=http://127.0.0.1:8000
export https_proxy=http://127.0.0.1:8000
export no_proxy='localhost,127.0.0.1'
```

Provision in troubleshooting mode:

```bash
pulumi up --logtostderr --logflow -v=9 2>pulumi.log
```

# References

* [Pulumi Troubleshooting](https://www.pulumi.com/docs/support/troubleshooting/)
* [Pulumi Azure Native provider API documentation](https://www.pulumi.com/registry/packages/azure-native/api-docs/)
* [Azure rest-api specs postgresql examples](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/postgresql/resource-manager/Microsoft.DBforPostgreSQL/stable/2022-12-01/examples)
* [Azure Database for PostgreSQL product page](https://azure.microsoft.com/en-us/services/postgresql/)
* [Azure Database for PostgreSQL pricing page](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/)
* [Overview - Azure Database for PostgreSQL - Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/overview)
  * [Comparison chart - Azure Database for PostgreSQL Single Server and Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-compare-single-server-flexible-server)
* [Azure Database for PostgreSQL Flexible Server SKUs](https://learn.microsoft.com/en-us/azure/templates/microsoft.dbforpostgresql/2022-12-01/flexibleservers#sku)
* [Encrypted connectivity using Transport Layer Security in Azure Database for PostgreSQL - Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/how-to-connect-tls-ssl)
