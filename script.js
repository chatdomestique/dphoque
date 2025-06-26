globalThis.apiUrl = "https://api.chat.eqilia.eu/api/v0"

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

async function _handleClientLogin() {
	showElement("accountStatusContainer");

	await new Promise(async (resolve) => {
		const switchStatusButton = getElement("accountStatusContainerSpecialButton");
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

		switchyStatus.addEventListener("click", () => {
			if (state === "login") {
				changeState("register");
			} else {
				changeState("login");
			}
		});

		switchStatusButton.addEventListener("click", async () => {
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
	});

	hideElement("accountStatusContainer");
	return;
}

async function handleClientLogin() {
	const token = localStorage.getItem("token");
	showElement("mainAppContainer");

	if (token === null) {
		await _handleClientLogin();
		return;
	}

	return;
}

function timestampToString(timestamp) {
	let 
}

function createMessage(userId, content, timestamp) {
	const messageChatBox = getElement("mainAppContainerChatBox");

	const messageContainer = document.createElement("div");
	const messageContent = document.createElement("div");
	const messageAuthor = document.createElement("span");
	const messageStamp = document.createElement("span");

	messageStamp.innerText = new Date(timestamp);

	messageAuthor.innerText = `${userId} `;
	messageAuthor.classList.add("font_size_standard");

	messageContent.innerText = content;

	messageContainer.append(messageAuthor);
	messageContainer.append(messageStamp);
	messageContainer.append(messageContent);

	messageChatBox.append(messageContainer);

	messageChatBox.scrollTop = messageChatBox.scrollHeight;

	return;
}

// function resizeShit() {
// 	const messageChatBox = getElement("mainAppContainerChatBox");
// 	const height = window.innerHeight;
// 	const width = window.innerWidth;

// 	console.log(height * 0.5);

// 	messageChatBox.style.height = (height * 0.5) / 1;
// 	messageChatBox.style.width = (width * 0.5) / 1;
// }
// window.addEventListener("resize", () => {
// 	console.log("resize event");
// 	resizeShit();
// });

function handleClientShit() {
	let i = 0;
	// resizeShit();

	return new Promise((resolve) => {
		// setInterval(() => {
			// createMessage("meow", (i++).toString(), Date.now());
		// }, 100);

		createMessage("test", "test", 0);
		// createMessage("eqilia", "Web development is sometimes odd.", Date.now());
		// createMessage("eqilia", "No, like, seriously, what the fuck?", Date.now()+2500);
		// createMessage("eqilia", "I thought I was insane while writing it.", Date.now()+3500);
		// createMessage("eqilia", "\"position, height, width\"... It didn't work.", Date.now()+5500);
		// createMessage("eqilia", "I'm scared in how this will come out when servers are fully implemented.", Date.now()+7600);
	});
}

document.addEventListener("DOMContentLoaded", async () => {
	await handleCookieConsent();
	await handleClientLogin();
	await handleClientShit();

	window.location.href = window.location.href;
});
