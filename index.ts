import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as dbforpostgresql from "@pulumi/azure-native/dbforpostgresql/v20221201";
import * as random from "@pulumi/random";

const config = new pulumi.Config("example");
const zone = config.require("zone");

const postgresUserPassword = new random.RandomPassword("postgres", {
    // NB must be between 8-128.
    length: 16,
    minLower: 1,
    minUpper: 1,
    minNumeric: 1,
    minSpecial: 1,
});

const example = new azure.resources.ResourceGroup("example");

const postgres = new dbforpostgresql.Server("postgres", {
    resourceGroupName: example.name,
    location: example.location,
    availabilityZone: zone,
    version: "15",
    administratorLogin: "postgres",
    administratorLoginPassword: postgresUserPassword.result,
    backup: {
        backupRetentionDays: 7,
    },
    // see az postgres flexible-server list-skus --location northeurope
    // see https://learn.microsoft.com/en-us/azure/templates/microsoft.dbforpostgresql/2022-12-01/flexibleservers#sku
    // see https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/
    sku: {
        tier: "GeneralPurpose",
        name: "Standard_D2ds_v4", // 2 vCore. 8 GiB RAM.
    },
    storage: {
        storageSizeGB: 32,
    }
});

new dbforpostgresql.FirewallRule("all", {
    resourceGroupName: example.name,
    serverName: postgres.name,
    startIpAddress: "0.0.0.0",
    endIpAddress: "255.255.255.255",
});

export const fqdn = postgres.fullyQualifiedDomainName;
export const password = postgresUserPassword.result;
