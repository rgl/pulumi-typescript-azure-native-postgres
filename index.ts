import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as dbforpostgresql from "@pulumi/azure-native/dbforpostgresql/v20210601";
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

// TODO how to set the zone in this Server resource?
// TODO why is this failing?
// NB a similar terraform example is working fine at https://github.com/rgl/terraform-azure-postgres.
//
// Diagnostics:
//   pulumi:pulumi:Stack (example-dev):
//     error: update failed
//
//   azure-native:dbforpostgresql/v20210601:Server (postgres):
//     resource partially created but read failed autorest/azure: Service returned an error. Status=404 Code="ResourceNotFound" Message="The requested resource of type 'Microsoft.DBforPostgreSQL/flexibleServers' with name 'postgrescb617a17' was not found.": Code="InternalServerError" Message="An unexpected error occured while processing the request. Tracking ID: 'a0a86aa3-6a27-4d9d-8b1d-b2b09da3d3f0'"
const postgres = new dbforpostgresql.Server("postgres", {
    resourceGroupName: example.name,
    location: example.location,
    version: "14",
    administratorLogin: "postgres",
    administratorLoginPassword: postgresUserPassword.result,
    backup: {
        backupRetentionDays: 7,
    },
    // Development (aka Burstable) sku.
    // 1 vCores, 2 GiB RAM, 32 GiB storage.
    // see https://docs.microsoft.com/en-us/azure/templates/microsoft.dbforpostgresql/2021-06-01/flexibleservers#sku
    sku: {
        tier: "Burstable",
        name: "Standard_B1ms",
    },
});

export const fqdn = postgres.fullyQualifiedDomainName;
export const host = postgres.name;
export const password = postgresUserPassword.result;
