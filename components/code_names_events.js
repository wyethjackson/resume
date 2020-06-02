'use strict';

const EventEmitter = require('events');
const wretch = require("wretch");
wretch().polyfills({
    fetch: require("node-fetch"),
    FormData: require("form-data"),
    URLSearchParams: require("url").URLSearchParams
});
class CodeNamesEvents extends EventEmitter {
  constructor(code_name_id) {
    super();
    this.code_name_id = code_name_id;
  }

  fetch() {
    return wretch(`http://localhost:5000/projects/code_names/${this.code_name_id}/ajax`)
      .get()
      .json((body) => body)
      .catch(error => { console.log("ERROR>>> ", error) })
  }

  updateGuessCard({word, guesses, turn}) {
    wretch(`http://localhost:5000/projects/code_names/${this.code_name_id}/ajax`)
      .post({
        word,
        guesses,
        turn
      })
      .res(response => console.log("UPDATE GUESS CARD RESPONSE", response))
      .catch(error => { console.log("ERROR>>> ", error) })
  }

  updateTurn({turn, word}) {
    wretch(`http://localhost:5000/projects/code_names/${this.code_name_id}/ajax`)
      .post({turn, word})
      .res(response => console.log("UPDATE TURN RESPONSE", response))
      .catch(error => { console.log("ERROR>>> ", error) })
  }

  updateGiveGuess({clue, guess_given, guess_text}) {
    wretch(`http://localhost:5000/projects/code_names/${this.code_name_id}/ajax`)
      .post({clue, guess_given, guess_text})
      .res(response => console.log("UPDATE TURN RESPONSE", response))
      .catch(error => { console.log("ERROR>>> ", error) })
  }
}

module.exports = CodeNamesEvents;
