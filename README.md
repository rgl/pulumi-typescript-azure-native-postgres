# About

This creates an example [Azure Database for PostgreSQL Flexible Server](https://azure.microsoft.com/en-us/services/postgresql/) instance using the [Pulumi Azure Native provider](https://www.pulumi.com/registry/packages/azure-native).

This will:

* Create a public PostgreSQL instance.
* Configure the PostgresSQL instance to require TLS.
* Enable automated backups.
* Set a random `postgres` account password.
* Show how to connect to the created PostgreSQL instance using `psql`.

For further managing the PostgreSQL instance, you could use:

* The [community.postgresql Ansible Collection](https://galaxy.ansible.com/community/postgresql) as in [rgl/ansible-init-postgres](https://github.com/rgl/ansible-init-postgres).

For equivalent examples see:

* [pulumi google-native](https://github.com/rgl/pulumi-typescript-google-postgres)
* [terraform azurerm](https://github.com/rgl/terraform-azure-postgres)
* [terraform gcp](https://github.com/rgl/terraform-gcp-cloud-sql-postgres)

# Usage (Windows)

Install the dependencies:

```powershell
choco install -y azure-cli --version 2.39.0
choco install -y pulumi --version 3.38.0
choco install -y nodejs-lts --version 16.17.0
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
. .\secrets.ps1
pulumi login
pulumi whoami -v
pulumi stack init dev
pulumi config set azure-native:location northeurope
# NB make sure the selected location has this zone available. when its not
#    available, the deployment will fail with InternalServerError.
pulumi config set example:zone 1
pulumi up
```

Connect to it:

```powershell
# see https://www.postgresql.org/docs/14/libpq-envars.html
# see https://docs.microsoft.com/en-us/azure/postgresql/flexible-server/how-to-connect-tls-ssl
$cacertsUrl = 'https://dl.cacerts.digicert.com/DigiCertGlobalRootCA.crt.pem'
$cacertsPath = Split-Path -Leaf $cacertsUrl
(New-Object Net.WebClient).DownloadFile($cacertsUrl, $cacertsPath)
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = $cacertsPath
$env:PGHOST = pulumi stack output fqdn
$env:PGDATABASE = 'postgres'
$env:PGUSER = "postgres@$(pulumi stack output host)"
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

# Reference

* [Pulumi Azure Native provider API documentation](https://www.pulumi.com/registry/packages/azure-native/api-docs/)
* [Azure rest-api specs postgresql examples](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/postgresql/resource-manager/Microsoft.DBforPostgreSQL/stable/2021-06-01/examples)
* [Azure Database for PostgreSQL product page](https://azure.microsoft.com/en-us/services/postgresql/)
* [Azure Database for PostgreSQL pricing page](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/)
* [Overview - Azure Database for PostgreSQL - Flexible Server](https://docs.microsoft.com/en-us/azure/postgresql/flexible-server/overview)
  * [Comparison chart - Azure Database for PostgreSQL Single Server and Flexible Server](https://docs.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-compare-single-server-flexible-server)
* [Azure Database for PostgreSQL Flexible Server SKUs](https://docs.microsoft.com/en-us/azure/templates/microsoft.dbforpostgresql/2021-06-01/flexibleservers#sku)
* [Encrypted connectivity using Transport Layer Security in Azure Database for PostgreSQL - Flexible Server](https://docs.microsoft.com/en-us/azure/postgresql/flexible-server/how-to-connect-tls-ssl)
