const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
let health = require('grpc-js-health-check');
const _ = require('lodash');

function getChannelCredentials() {
  const rootCert = fs.readFileSync("./certs/ca-cert.pem");

  const channelCredentials = grpc.ChannelCredentials.createSsl(rootCert);

  return channelCredentials;
}

function main() {
  const packageDefinition = protoLoader.loadSync("./proto/locationStream.proto", {});

  const locationTrackingApp =
    grpc.loadPackageDefinition(packageDefinition).locationTrackingApp;
  const client = new locationTrackingApp.Location(
    "localhost:50051",
    getChannelCredentials()
  );

  const stream = client.updateLocation((error, res) => {
    if (error) {
      console.error(error)
      return;
    }
    console.log(res)
  });

  const driverId = "driver"

  for (let i = 0; i < 10; i++) {
    stream.write({
      driverId,
      longitude: "2." + i,
      latitudes: "3.1"
    });
  }


  stream.end();

  const data = {
    driverId,
  }

  var getStream = client.getLocations(data)

  getStream.on("data", (data) => {
    console.log(data)
  })

  getStream.on("end", () => {
    console.log("Driver Reached")
  })
}

main();
