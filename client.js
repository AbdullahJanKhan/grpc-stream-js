const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");

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
    "localhost:8000",
    getChannelCredentials()
  );

  const stream = client.updateLocation((error, res) => {
    if (error) {
      console.error(error)
      return;
    }
    console.log(res)
  });

  stream.write({
    driverId: "driver_id_2",
    longitude: "2.2",
    latitudes: "3.1"
  });
  stream.write({
    driverId: "driver_id_2",
    longitude: "2.3",
    latitudes: "3.1"
  });
  stream.write({
    driverId: "driver_id_1",
    longitude: "2.5",
    latitudes: "3.1"
  });
  stream.write({
    driverId: "driver_id_1",
    longitude: "2.7",
    latitudes: "3.1"
  });
  stream.write({
    driverId: "driver_id_1",
    longitude: "2.6",
    latitudes: "3.1"
  });
  stream.write({
    driverId: "driver_id_1",
    longitude: "2.6",
    latitudes: "3.2"
  });
  stream.write({
    driverId: "driver_id_1",
    longitude: "2.6",
    latitudes: "3.3"
  });
  stream.end();
}

main();
