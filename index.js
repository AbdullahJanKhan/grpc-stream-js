const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
const path = require("path");

function getServerCredentials() {
  const serverCert = fs.readFileSync("./certs/server-cert.pem");
  const serverKey = fs.readFileSync("./certs/server-key.pem");

  const serverCredentials = grpc.ServerCredentials.createSsl(
    null,
    [
      {
        cert_chain: serverCert,
        private_key: serverKey,
      },
    ],
    false
  );
  return serverCredentials;
}

function main() {
  const server = new grpc.Server();
  const packageDefinition = protoLoader.loadSync("./proto/locationStream.proto", {});

  const locationTrackingApp =
    grpc.loadPackageDefinition(packageDefinition).locationTrackingApp;
  // Add the service
  server.addService(locationTrackingApp.Location.service, {
    updateLocation: updateLocation,
  });

  const credentials = getServerCredentials();

  server.bindAsync("0.0.0.0:8050", credentials, () => {
    server.start();
    console.log("Server running at http://0.0.0.0:8050");
  });
}

// Uhm, this is going to mirror our database, but we can change it to use an actual database.
var driverLocations = {};

function updateLocation(call, callback) {

  call.on('data', (req) => {
    if (!driverLocations[req.driverId]) {
      driverLocations = {
        ...driverLocations,
        [req.driverId]: [{
          longitude: req.longitude,
          latitudes: req.latitudes
        }]
      }
    } else {
      driverLocations[req.driverId].push({
        longitude: req.longitude,
        latitudes: req.latitudes
      })
    }
  })

  call.on('end', () => {
    console.log("Stream Completed")
    console.log(driverLocations)
    callback(null, {});
  });
}

main();
