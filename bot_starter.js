// Create the configuration
var config = {
  channels: ['#channel'],
  server: 'irc.freenode.net',
  botName: 'botName',
  controlchannel: '#controlchannel',
  admin_user: 'username'
};

messageLog = [];

function Message(from, text, channel) {
  this.channel = channel;
  this.from = from;
  this.text = text;
}

// Get the libs
irc = require("irc");
sqlite3 = require('sqlite3').verbose();
db = new sqlite3.Database('Factoids3.db', sqlite3.OPEN_READONLY);
//shell = require('shelljs'); //Only needed when updating the factoids db is needed
cheerio = require('cheerio');
request = require('request');
//Check the shell not needed when updating db disabled
//var shellWorks = checkShell();

// Create the bot name
bot = new irc.Client(config.server, config.botName, {
  channels: config.channels
});

/*
 * Some functions for functionality and database stuff
 */

function findLastMessageInLog(channel) {
  var j = 0;
  for (var i = messageLog.length - 1; i >= 0; i--) {
    if (messageLog[i].channel === channel) {
      if (j === 1) {
        return {
          text: messageLog[i].text,
          from: messageLog[i].from
        }
      }
      j++;
    }
  }
}

function updateDatabase() {
  //TODO Check if database is connected, disconnect if not
  //clone from github
  console.log('fetching database from git');
  //shell.exec('git clone gitURL');
  console.log('Converting database');
  shell.mv('-f', 'Factoids3.db', 'Factoids3.db_old');
  shell.exec('sqlite folder/Factoids.db .dump  | sqlite3 Factoids3.db');
  //shell.rm('-rf', 'folder');
  return true;
}

function stopDatabase() {
  sashs
  db.close();
  console.log("Database stopped");
}

function reloadDatabase() {
  db = new sqlite3.Database('Factoids3.db', sqlite3.OPEN_READONLY);
  console.log("Database started");
  return 0;
}

function checkShell() {
  if (!shell.which('git') || !shell.which('sqlite') || !shell.which('sqlite3')) {
    console.log("This bot needs sqlite3 to function properly");
    return false;
  }
  console.log("sqlite3 are accessible, continue start.")
}

function testQuery() {
  var key = '"niemals"';
  var query = 'SELECT fact FROM factoids INNER JOIN keys on factoids.id = keys.factoid_id WHERE keys.key LIKE' + key + ';';
  db.each(query, function(err, value) {
    var answer = value.fact;
    console.log(answer);
  });
}


/*
 * Functions with IRC output
 */
function replaceText(from, to, messageLog, text) {
  var lastMessage = findLastMessageInLog(to, messageLog);
  var splitted = text.split(/\//);
  var global_replacement = '';
  if (splitted[3] === 'g') {
    global_replacement = 'g';
  }
  //just continue if the regexes are well formed
  if (splitted.length === 4 && typeof(lastMessage.text) != 'undefined') {
    try {
      var a = new RegExp(splitted[1], global_replacement);
      var b = splitted[2];
      var newMessage = lastMessage.text.replace(a, b);
      if (newMessage != lastMessage.text) {
        newMessage = '<' + lastMessage.from + '> ' + newMessage;
        //messageLog.push(new Message(config.botName, newMessage, to));
        bot.say(to, newMessage);
      }
    } catch (e) {
      console.log(e + " verursacht durch " + lastMessage.text + " von " + lastMessage.username);
    }
  }
}

function queryFact(to, text) {
  var key = "\"" + text.split(/[! >]/)[1] + "\"";
  var username = text.split(/\> /)[1];
  var userAdressed = 0;
  if (username != null) {
    userAdressed = 1;
  }
  var query = 'SELECT fact FROM factoids INNER JOIN keys on factoids.id = keys.factoid_id WHERE keys.key LIKE' + key + ';';
  if (db.open) {
    db.each(query, function(err, value) {
      var answer = value.fact;
      if (userAdressed) {
        answer = username + ": " + answer;
      }
      //messageLog.push(new Message(config.botName, answer, to));
      bot.say(to, answer);
    });
  }
}

function getPageTitle(to, httpLink) {
  var requestOptions = {
    url: String(httpLink),
    method: 'GET'
  };
  request(requestOptions, function(error, response, html) {
    if (!error) {
      var page = cheerio.load(html);
      var title = page('title').text();
      if (title.length > 0) {
        messageLog.push(new Message(config.botName, 'Seitentitel: ' + title, to));
        bot.say(to, title);
      }
    }
  });
}

// Listen for joins
bot.addListener("join", function(channel, who) {
  // Welcome them in!
});

bot.addListener("message", function(from, to, text, message) {
    //Log all messages
    messageLog.push(new Message(from, text, to));
    //Get Regex
    //Regex for text replacement
    var regexStart = new RegExp('^s/', 'g');
    //Regex for sql query
    var queryStart = new RegExp('^!', 'g');
    //Simple Regex (http in string)
    var httpInString = new RegExp('http', 'g')
      //Regex for http links
    var fullHttpLink = new RegExp(/^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/i); //Thanks to https://gist.github.com/dperini/729294 and https://mathiasbynens.be/demo/url-regex
    //Regex for letting the bot talk
    var sayStart = new RegExp('^SAY', 'g');
    //Regex bot-Name
    var reBotName = new RegExp('^' + config.botName, 'g');

    if (reBotName.test(text)) {
      bot.say(to, 'I\'m a bot.');
    }
    //Replace sed style
    //s/a/b/ <- no other syntax
    else if (regexStart.test(text)) {
      replaceText(from, to, messageLog, text);
    } else if (queryStart.test(text)) {
      queryFact(to, text);
    } else if (httpInString.test(text)) {
        //get the page into a html obj
        var splitted = text.split(' ');
        splitted.forEach(function(element) {
          var link = fullHttpLink.exec(element);
          if (link != null) {
            getPageTitle(to, link);
          }
        });
      }
    } else if (to === config.controlchannel && from === config.admin_user) {
    if (text === 'UPDATE_DB') {
      console.log("Not activated, need sqlite2, not available at uperspace by default");
      return 0;
      // stopDatabase();
      // updateDatabase();
      // reloadDatabase();
    } else if (text === "STOP_DB") {
      stopDatabase();
    } else if (text === "START_DB") {
      reloadDatabase();
    }
  }
  console.log(messageLog[messageLog.length - 1]);
});
