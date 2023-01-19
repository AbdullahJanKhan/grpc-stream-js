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
  const packageName = 'grpc.health.v1';
  const serviceName = 'Health';
  const protoPath = "./proto/health.proto"

  const packageDef = protoLoader.loadSync(
    protoPath,
    {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    },
  );
  const GrpcService = _.get(grpc.loadPackageDefinition(packageDef), packageName)[serviceName];
  var healthClient = new GrpcService("localhost:50051", getChannelCredentials());
  healthClient.check({ service: "locationTrackingApp.Location" }, (err, response) => {
    if (err)
      console.error(err)
    console.log(response)
  })

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

  const data = {
    driverId: "1",
  }

  // var getStream = client.getLocations(data)

  // getStream.on("data", (data) => {
  //   console.log(data)
  // })

  // getStream.on("end", () => {
  //   console.log("Driver Reached")
  // })
}

main();
