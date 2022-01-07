const socket = io();
const WIDTH = 64;
const HEIGHT = 64;
const SPEED=2;

var canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let username;
let pokemon;
let players = [];
var mainPlayer;
var userID;
let messages = [];
let msg = [];

// Initialize variables from HTML
const $window = $(window);
const $usernameInput = $('.usernameInput'); // Input for username
const $messages = $('.messages');           // Messages area
const $inputMessage = $('.inputMessage');   // Input message input box
const $button = $(':submit');
const $loginPage = $('.login.page');        // The login page
const $chatPage = $('.game.page');          // The chatroom page
const $yesNoPrompt = $('.cd-popup-container');

// Prompt for setting a username and a pokemon

$('input[type="submit"]').click(function () {
    username = $usernameInput.val();
    pokemon = $(this).val();

    if (username && pokemon) {
        $('.usernameInput').val('');
        $loginPage.fadeOut();
        $chatPage.show();
        $loginPage.off('click');
        socket.emit('new player', username, pokemon);
    }
});

// Canvas loading methods
function drawMap() {
    for (var i = 0; i < 2; i++) {
        let map = new Image();
        map.src = "./texture/layer_" + i + ".png";
        ctx.drawImage(map, 0, 0);
    }
}

function drawPlayers() {
    drawMap();

    players.forEach(function ({ x, y, pokemon, name, direction, pos }) {
        img = new Image();
        img.src = "./texture/" + pokemon + '.png';
        ctx.drawImage(img, pos * 64, direction * 64, 64, 64, x, y, 64, 64);
        ctx.font = "bold 15px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = 'black';
        ctx.fillText(name, x + 32, y + 10);
    });

    let map = new Image();
    map.src = "./texture/layer_2.png";
    ctx.drawImage(map, 0, 0);
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    movePlayer();
    drawPlayers();
    requestAnimationFrame(update);
}
// first call
requestAnimationFrame(update);

function getMainPlayer() {
    for (i = 0; i < players.length; i++) {
        if (players[i].id == socket.id) {
            return players[i];
        }
    }
}

// Keyboard Listener
const keyboard = {};

window.onkeydown = function (e) {
    keyboard[e.key] = true;
};

window.onkeyup = function (e) {
    delete keyboard[e.key];
};

// method to move player on the canvas
function movePlayer() {

    if (keyboard['ArrowLeft'] || keyboard['Q']) {
        socket.emit('move left');
    }
    if (keyboard['ArrowUp'] || keyboard['Z']) {
        socket.emit('move up');
    }
    if (keyboard['ArrowRight'] || keyboard['D']) {
        socket.emit('move right');
    }
    if (keyboard['ArrowDown'] || keyboard['S']) {
        socket.emit('move down');
    }

    if (typeof mainPlayer !== 'undefined') {

        for (i = 0; i < players.length; i++) {
            if (players[i].id != mainPlayer.id) {
                var xDiff = mainPlayer.x - players[i].x;
                var yDiff = mainPlayer.y - players[i].y;

                if (Math.sqrt(xDiff * xDiff + yDiff * yDiff) < 30) {
                    userID = players[i].id;
                    socket.emit('check-user', players[i]);
                } else {
                    closeChat();
                }
            }
        }
    }
}

// Function for buttons ---------------------------------------------------
function disconnectPlayer() {
    socket.emit('removeUser');
    $chatPage.fadeOut();
    $loginPage.show();
    $chatPage.off('click');
};

function closeChat() {
    var list = document.getElementById("messages");
    while (list.hasChildNodes()) {
        list.removeChild(list.firstChild);
    }
    $('.chat-container').removeClass('is-visible');
}

function yesPressed() {
    socket.emit('talking', {
        id: userID,
        answer: "yes"
    });
    $('.cd-popup').removeClass('is-visible');
};

function noPressed() {
    socket.emit('talking', {
        id: userID,
        answer: "no"
    });
    $('.cd-popup').removeClass('is-visible');
};


// Methods to display messages ---------------------------------------------------
const addChatMessage = (data) => {
    const $timeDiv = $('<span class="time"/>')
        .text(data.time + "\t")
        .css('font-weight', 'bold');
    const $usernameDiv = $('<span class="username"/>')
        .text(data.username+"\t")
        .css('color', getUsernameColor(data.username));
    const $messageBodyDiv = $('<span class="messageBody">')
        .text("\t"+data.message);
    const $messageDiv = $('<li class="message"/>')
        .data('username', data.username)
        .append($timeDiv, $usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv);
}

const addMessageElement = (el) => {
    const $el = $(el);
    $messages.append($el);
    $messages[0].scrollTop = $messages[0].scrollHeight;
}

function getUsernameColor(username) {
    if (username == mainPlayer.name) {
        return '#e21400';
    } else {
        return '#1a264f';
    }
}

function cleanInput(input) {
    return $('<div/>').text(input).html();
}

function sendMessage(id) {
    let message = $inputMessage.val();
    message = cleanInput(message);
    if (message) {
        $inputMessage.val('');
        let time = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: "numeric",
            minute: "numeric"
        });
        addChatMessage({ time: time, username: mainPlayer.name, message: message });
        socket.emit('new message', { message, id, time });
    }
}

function loadPreviousMessages(messages) {
    messages.forEach(msg => {
        addChatMessage(msg);
    })
}

// SOCKET EVENTS ------------------------------------------------------

socket.on('players list', function (list) {
    players = list;
    mainPlayer = getMainPlayer();
});

socket.on('join', function (name) {
    const item = document.createElement('h3');
    // set innerText with the message
    item.innerText = name + ' has joined the game';
    const gamePage = document.getElementById('gamepage')
    gamePage.appendChild(item);
    setTimeout(function () {
        gamePage.removeChild(item);
    }, 5000);
});

socket.on("ask-to-talk", (data) => {
    document.getElementById("name").innerHTML = data.name;
    $('.cd-popup').addClass('is-visible');
});

socket.on('start-chat-possible', (data) => {
    socket.emit('check-answer', data);
});

socket.on('open-chat', (data) => {
    document.getElementById("chat-name").innerHTML = data.username;
    $('.chat-container').addClass('is-visible');
    $inputMessage.focus();
    //messages = data.messages;
    //loadPreviousMessages(msg);
    if (keyboard['Enter']) {
        sendMessage(userID);
    }
});

socket.on('new message', (data) => {
    addChatMessage(data);
})

socket.on("send-delete-user-array", (id) => {
    socket.emit('delete-user-array', id);
});
