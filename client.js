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

  for (let i = 0; i < 10; i++) {
    stream.write({
      driverId: "driver",
      longitude: "2." + i,
      latitudes: "3.1"
    });
  }


  stream.end();
}

main();
