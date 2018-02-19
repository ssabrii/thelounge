"use strict";

const net = require("net");
const expect = require("chai").expect;
const Chan = require("../../src/models/chan");
const Client = require("../../src/client");

describe("Client", function() {
	const testPort = 32356;
	let ircServer;
	const traffic = [];

	before((done) => {
		ircServer = net.createServer((connection) => {
			connection.on("data", (data) => {
				data.toString().trim().split("\n").forEach((line) => {
					traffic.push(line);
				});
			});
		}).listen(testPort, done);
	});

	after(() => ircServer.close());

	const client = new Client({
		sockets: null,
		identHandler: {
			addSocket() {},
			removeSocket() {},
		},
	}, "lounge-mocha-user", {});

	client.connect({
		name: "TEST Network",
		host: "127.0.0.1",
		port: testPort,
		username: "mocha-user",
		realname: "Mocha User",
		password: "mocha-password",
		join: "#thelounge,&foobar",
	});

	it("should set client name", () => {
		expect(client.name).to.equal("lounge-mocha-user");
	});

	it("should create network and IRC objects", () => {
		expect(client.networks).to.be.length(1);

		const network = client.networks[0];
		expect(network.irc).to.not.be.null;
		expect(network.name).to.equal("TEST Network");
		expect(network.host).to.equal("127.0.0.1");
		expect(network.port).to.equal(testPort);
		expect(network.password).to.equal("mocha-password");
		expect(network.username).to.equal("mocha-user");
		expect(network.realname).to.equal("Mocha User");
		expect(network.nick).to.equal("lounge-user");

		expect(network.channels).to.be.length(3);
		expect(network.channels[0].name).to.equal("TEST Network");
		expect(network.channels[0].type).to.equal(Chan.Type.LOBBY);
		expect(network.channels[1].name).to.equal("#thelounge");
		expect(network.channels[1].type).to.equal(Chan.Type.CHANNEL);
		expect(network.channels[2].name).to.equal("&foobar");
		expect(network.channels[2].type).to.equal(Chan.Type.CHANNEL);
	});

	it("should send IRC traffic", (done) => {
		// TODO: There should be a better way
		setTimeout(() => {
			expect(traffic).to.deep.equal([
				"CAP LS 302",
				"PASS mocha-password",
				"NICK lounge-user",
				"USER mocha-user 0 * :Mocha User",
			]);

			client.input({
				target: client.networks[0].channels[0].id,
				text: "/disconnect",
			});

			done();
		}, 600);
	});

	it("should attach clients", () => {
		client.clientAttach(1337, "this is my token");

		expect(client.lastActiveChannel).to.equal(-1);
		expect(client.attachedClients[1337]).to.be.an.object;
		expect(client.attachedClients[1337].token).to.equal("this is my token");

		client.clientAttach(1337, 1000);

		expect(client.lastActiveChannel).to.equal(-1);
		expect(client.attachedClients[1337].openChannel).to.equal(-1);

		client.clientAttach(1337, client.networks[0].channels[1].id);

		expect(client.lastActiveChannel).to.equal(client.networks[0].channels[1].id);
		expect(client.attachedClients[1337].openChannel).to.equal(client.networks[0].channels[1].id);
	});
});
