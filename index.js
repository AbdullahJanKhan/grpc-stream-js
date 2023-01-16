const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");

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
    getLocations: getLocations,
  });

  const credentials = getServerCredentials();

  server.bindAsync("0.0.0.0:50051", credentials, (err, port) => {
    if (err) {
      console.error(err)
      return
    }
    server.start();
    console.log(`Server running at http://0.0.0.0:${port}`);
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

function getLocations(call) {

  console.log(call.request)
  const id = call.request.driverId

  for (let i = 0; i < 10; i++) {
    let res = {
      longitude: "1." + i,
      latitudes: "0.2"
    }
    console.log(res)
    call.write(res)
  }

  call.end()

}

main();
