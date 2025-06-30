globalThis.apiUrl = "https://api.chat.eqilia.eu/api/v0";
globalThis.gatewayUrl = "wss://api.chat.eqilia.eu/api/v0/live/ws";

function getElement(id) {
	return document.getElementById(id);
}

function setAttr(id, key, value) {
	getElement(id)[key] = value;
	return;
}

function showElement(id) {
	getElement(id).style.display = "block";
	getElement(id).hidden = false;
}

function hideElement(id) {
	getElement(id).style.display = "none";
	getElement(id).hidden = true;
}

async function peakFetch(url, body, token) {
	let headers = {};

	headers["content-type"] = "application/json"
	if (token !== undefined) {
		headers["authorization"] = token;
	}

	const req = await fetch(url, {
		method: "POST",
		body: JSON.stringify(body),
		headers
	});

	return {
		payload: await req.json(),
		status: req.status
	}
}

async function peakFetchGET(url, token) {
	let headers = {};

	if (token !== undefined) {
		headers["authorization"] = token;
	}

	const req = await fetch(url, {
		method: "GET",
		headers
	});

	return {
		payload: await req.json(),
		status: req.status
	}
}

class CacheMonster {
	constructor(fetchFunction) {
		// super();
		this._fletcher = fetchFunction;
		this.cache = new Map();
	}
	async fetch(objectId) {
		const data = await this._fletcher(objectId);
		this.cache.set(objectId, data);

		return data;
	}
	async get(objectId) {
		let data = this.cache.get(objectId);
		if (data === undefined) {
			data = await this.fetch(objectId);
		}

		return data;
	}
	acquire(objectId) {
		return this.cache.get(objectId);
	}
}

async function _handleCookieConsent() {
	const buttonA = getElement("cookieConsent");
	const buttonB = getElement("noCookieConsent");
	showElement("cookieStatusContainer");

	buttonB.addEventListener("click", () => {
		hideElement("cookieConsent");
		hideElement("noCookieConsent");
		hideElement("cookieStatusContainerNotice");
		showElement("cookieStatusContainerNoticeAcknowledgment");

		localStorage.clear();
	});

	await new Promise((a) => buttonA.addEventListener("click", a));
	localStorage.setItem("userDataStorageConsent", Date.now()+(60*60*24*14));

	hideElement("cookieStatusContainer");
}

async function handleCookieConsent() {
	let storageConsent = localStorage.getItem("userDataStorageConsent");
	if (storageConsent === undefined) {
		await _handleCookieConsent();
		return;
	}
	storageConsent = parseInt(storageConsent);

	if (Date.now() > storageConsent) {
		await _handleCookieConsent();
		return;
	}

	return;
}

async function _handleClientLogin() {
	showElement("accountStatusContainer");

	await new Promise(async (resolve) => {
		const switchStatusButton = getElement("accountStatusContainerDataSubmitForm");
		const switchyStatus = getElement("accountStatusContainerSpecialSwitchButton");
		let state = "login";

		function changeState(newState) {
			state = newState;

			switch (state) {
			case "login":
				getElement("accountStatusContainerSpecialButton").innerText = "Login";
				getElement("accountStatusContainerSpecialSwitchButton").innerText = "No account? Register instead!";
				break;
			case "register":
				getElement("accountStatusContainerSpecialButton").innerText = "Register";
				getElement("accountStatusContainerSpecialSwitchButton").innerText = "Already have an account? Login instead!";
				break;
			}
		}

		switchStatusButton.addEventListener("submit", async (e) => {
			e.preventDefault();
			hideElement("accountStatusContainerLoginFormFailureNotice");

			try {
				const username = getElement("accountStatusContainerUsernameInput").value;
				const password = getElement("accountStatusContainerPasswordInput").value;

				if (state === "register") {
					const regreq = await peakFetch(`${globalThis.apiUrl}/auth/register`, {
						username,
						password
					});
				}

				const logreq = await peakFetch(`${globalThis.apiUrl}/auth/login`, {
					username,
					password
				});
				if (logreq?.payload?.payload?.token === undefined) {
					throw new Error("what??");
				}

				localStorage.setItem("token", logreq.payload.payload.token);

				window.location.href = window.location.href;
			} catch (e) {
				showElement("accountStatusContainerLoginFormFailureNotice");
				console.error(e);
				return;
			}
		});

		switchyStatus.addEventListener("click", () => {
			if (state === "login") {
				changeState("register");
			} else {
				changeState("login");
			}
		});
	});

	hideElement("accountStatusContainer");
	return;
}

async function handleClientLogin() {
	const token = localStorage.getItem("token");
	globalThis.token = token;

	globalThis.channelMessageData = new Map();
	globalThis.channelData = new CacheMonster(async (objectId) => { return (await peakFetchGET(`${globalThis.apiUrl}/data/channel/${objectId}`, globalThis.token)).payload.payload; });
	globalThis.guildData = new CacheMonster(async (objectId) => { return (await peakFetchGET(`${globalThis.apiUrl}/data/guild/${objectId}`, globalThis.token)).payload.payload; });
	globalThis.userData = new CacheMonster(async (objectId) => { return (await peakFetchGET(`${globalThis.apiUrl}/data/user/${objectId}`, globalThis.token)).payload.payload; });

	if (token === null) {
		await _handleClientLogin();
		return;
	}

	return;
}

async function createMessage(messagePayload) {
	const author = await globalThis.userData.get(messagePayload.authorId);
	const messageChatBox = getElement("mainAppContainerChatBox");

	console.log(author);

	const messageContainer = document.createElement("div");
	const messageContent = document.createElement("div");
	const messageAuthor = document.createElement("span");
	const messageStamp = document.createElement("span");

	messageStamp.innerText = (new Date(messagePayload.timestamp)).toLocaleString();

	messageAuthor.innerText = `${author.displayName} `;
	messageAuthor.classList.add("font_size_standard");

	messageContent.innerText = messagePayload.content;

	messageContainer.append(messageAuthor);
	messageContainer.append(messageStamp);
	messageContainer.append(messageContent);

	messageChatBox.append(messageContainer);

	messageChatBox.scrollTop = messageChatBox.scrollHeight;

	return;
}

function handleClientShit() {
	showElement("appLoadingContainer");
	let i = 0;

	globalThis.channelIds = [];
	globalThis.guildIds = [];

	const websocketConnection = new WebSocket(globalThis.gatewayUrl, [globalThis.token]);

	websocketConnection.addEventListener("open", () => {
		console.log("Websocket connection opened");
	});

	websocketConnection.addEventListener("close", () => {
		hideElement("mainAppContainer");
		window.location.href = window.location.href;
	});

	websocketConnection.addEventListener("message", async (chunk) => {
		const msg = JSON.parse(chunk.data);

		switch (msg.type) {
		case "serverAuthentication":
			console.log(`Connected to ${msg.payload.serverName}, version ${msg.payload.version}`);
			break;
		case "authStatus":
			if (msg.payload.success) {
				break;
			}

			localStorage.removeItem("token");
			window.location.href = window.location.href;

			break;
		case "guildAvailable":
			globalThis.guildIds.push(msg.payload.uuid);
			console.log(`Received guildId ${msg.payload.uuid}`);
			break;
		case "channelAvailable":
			globalThis.channelIds.push(msg.payload.uuid);
			console.log(`Received channelId ${msg.payload.uuid}`);
			break;
		case "serverFinished":
			for (let i = 0; i < globalThis.guildIds.length; i++) {
				const guildId = globalThis.guildIds[i];
				console.log(`Fetching guild guildId:${guildId}`);
				await globalThis.guildData.fetch(guildId);
				console.log(`Fetch successful`);
			}

			for (let i = 0; i < globalThis.channelIds.length; i++) {
				const channelId = globalThis.channelIds[i];
				console.log(`Fetching channel channelId:${channelId}`);
				await globalThis.channelData.fetch(channelId);
				console.log(`Fetch successful`);

				console.log(`Fetching messages for channelId:${channelId}`);
				const baseMessages = await peakFetchGET(`${globalThis.apiUrl}/data/messages/${channelId}`, globalThis.token);
				for (let i = 0; i < baseMessages.payload.payload.messages.length; i++) {
					const message = baseMessages.payload.payload.messages[i];
					let channelMessages = globalThis.channelMessageData.get(message.channelId);
					if (channelMessages === undefined) {
						channelMessages = new Map();
					}

					channelMessages.set(message.uuid, message);
					globalThis.channelMessageData.set(message.channelId, channelMessages);
				}
				console.log(`Fetch successful, ${baseMessages.payload.payload.messages.length} messages retrieved.`);
			}

			hideElement("appLoadingContainer");
			showElement("mainAppContainer");
			break;
		case "messageCreate":
			await createMessage(msg.payload);
			break;
		default:
			console.warn(`Unknown message type ${msg.type}. Proceed with caution!`);
			console.log(msg);
			break;
		}
	});

	getElement("mainAppContainerForm").addEventListener("submit", async (e) => {
		e.preventDefault();
		const box = getElement("mainAppContainerFormText");

		const text = String(box.value);
		box.value = "";

		console.log(text);

		const msgreq = await peakFetch(`${globalThis.apiUrl}/message/post`, {
			content: text,
			guildId: "dbf2c411-6e27-50e0-b899-cbebfe91515c",
			channelId: "b9105365-a7ea-5fff-802b-5ef598439837"
		}, globalThis.token);
	});

	return new Promise((resolve) => {
	});
}

document.addEventListener("DOMContentLoaded", async () => {
	await handleCookieConsent();
	await handleClientLogin();
	await handleClientShit();

	window.location.href = window.location.href;
});
