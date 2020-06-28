'use strict';

const EventEmitter = require('events');
const wretch = require("wretch");
wretch().polyfills({
    fetch: require("node-fetch"),
    FormData: require("form-data"),
    URLSearchParams: require("url").URLSearchParams
});
class CodeNamesEvents extends EventEmitter {
  constructor(code_name_id, host_url) {
    super();
    this.code_name_id = code_name_id;
    this.host_url = host_url;
  }

  fetch() {
    return wretch(`${this.host_url}/projects/code_names/${this.code_name_id}/ajax`)
      .get()
      .json((body) => body)
      .catch(error => { console.log("ERROR>>> ", error) })
  }

  updateGuessCard({word, guesses, turn, winner}) {
    wretch(`${this.host_url}/projects/code_names/${this.code_name_id}/ajax`)
      .post({
        word,
        guesses,
        turn,
        winner,
      })
      .res(response => response)
      .catch(error => { console.log("ERROR>>> ", error) })
  }

  updateTurn({turn, word, has_guessed_all_clues}) {
    wretch(`${this.host_url}/projects/code_names/${this.code_name_id}/ajax`)
      .post({turn, word, has_guessed_all_clues})
      .res(response => response)
      .catch(error => { console.log("ERROR>>> ", error) })
  }

  updateGiveGuess({clue, guess_given, guess_text}) {
    wretch(`${this.host_url}/projects/code_names/${this.code_name_id}/ajax`)
      .post({clue, guess_given, guess_text})
      .res(response => response)
      .catch(error => { console.log("ERROR>>> ", error) })
  }
}

module.exports = CodeNamesEvents;
