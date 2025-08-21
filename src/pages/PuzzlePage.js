import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Divider from '@material-ui/core/Divider';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import Grid from '@material-ui/core/Grid';
import { NavLink } from "react-router-dom";

import styles from './commonStyles.js';
import EnhancedTableHead from './GuessTable.js';
import { ThemeContext } from "./util/config.js";
import puzzleInfo from './puzzleInfo.js';
import Tooltip from './Tooltip';

const MAX_PUZZLES = 12;

class PuzzlePage extends React.Component {
  static contextType = ThemeContext;

  constructor(props) {
    super(props);
    let puzzleId = parseInt(props.match.params.puzzleId);
    if (puzzleId > MAX_PUZZLES) {
      this.state = {invalid: true};
      return;
    }

    this.state = {
      puzzleId: puzzleId,
      name: puzzleInfo[puzzleId].name,
      pts: puzzleInfo[puzzleId].points,
      body: puzzleInfo[puzzleId].body ? puzzleInfo[puzzleId].body : "Additional info here.",

      teamGuesses: [],
      textField: "",
      errorText: "",
      lastGuess: "UNDEFINED_STATE_NO_LAST_GUESS",
      hideIncorrect: false,
      textFieldDisabled: false,
      isSolved: false,
    }
    let stored_progress = JSON.parse(localStorage.getItem("puzzle" + puzzleId));

    if (stored_progress) {
      this.state.teamGuesses = stored_progress;
      if (stored_progress.length > 0) {
        this.state.lastGuess = this.state.teamGuesses[stored_progress.length-1].g
      }
    }

    // Set up answer tokens
    let raw_answer = puzzleInfo[puzzleId].answer
    let answer_tokens = raw_answer.split(" ").map(token => {return {value: token, render: token}});
    let rendered_answer_tokens = answer_tokens.map(token => this.renderToken(token, "INITIALIZATION_GUESS_REDACT_ALL_WORDS"));
    this.state.teamGuesses.forEach(teamGuess => {
      // renderToken will mutate
      rendered_answer_tokens.map(token => this.renderToken(token, teamGuess.g))
    })
    this.state.answer_tokens = rendered_answer_tokens
    
    if (rendered_answer_tokens.every(token => token.value === token.render)) {
      this.state.isSolved = true;
    }

    // Render article using stored guesses
    let raw_article = puzzleInfo[puzzleId].article
    raw_article = raw_article.replace(/(\r\n|\n|\r)/g, " \n ")
    let tokens = raw_article.split(" ").map(token => {return {value: token, render: token}});
    let rendered_tokens = tokens.map(token => this.renderToken(token, "INITIALIZATION_GUESS_REDACT_ALL_WORDS"));
    this.state.teamGuesses.forEach(teamGuess => {
      // renderToken will mutate
      rendered_tokens.map(token => this.renderToken(token, teamGuess.g, this.state.isSolved))
    })
    this.state.article_tokens = rendered_tokens

    // Initialize solve status if not already done
    let solves = JSON.parse(localStorage.getItem("solves"));
    if (!solves) {
      solves = new Array(MAX_PUZZLES+1).fill(0);
    }
    localStorage.setItem("solves", JSON.stringify(solves));
  }

  componentDidUpdate() {
    if (parseInt(this.props.match.params.puzzleId) !== this.state.puzzleId) {
      window.location.reload();
    }
  }

  componentDidCatch(error, errorInfo) {
    localStorage.removeItem("puzzle" + this.state.puzzleId);

    // Reset solve status for this puzzle
    let solves = JSON.parse(localStorage.getItem("solves"));
    if (!solves) {
      solves = new Array(MAX_PUZZLES+1).fill(0);
    } else {
      solves[this.state.puzzleId] = 0;
    }
    localStorage.setItem("solves", JSON.stringify(solves));

    console.log(error, errorInfo);
    alert("Malformed save data detected, wiping saved attempts for this puzzle");
    window.location.reload();
  }

  stripAndLowercase = (str) => {
    let s = str.replace("<h2>", '').replace("</h2>", '')
    s = s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return s
  }

  // Render a token given a guess. 
  renderToken = (token, guess, isSolved=false) => {
    if (token.value.length === 0) {
      return token
    }
    if (guess === "INITIALIZATION_GUESS_REDACT_ALL_WORDS") {
      token.render = token.value.replace("<h2>", '').replace("</h2>", '')
      token.render = token.render.replace(/[a-zA-Z0-9]/g, '█');
      return token;
    }
    let stripped_token = this.stripAndLowercase(token.value);
    let stripped_guess = this.stripAndLowercase(guess);
    
    if (stripped_token === stripped_guess || isSolved) {
      token.render = token.value.replace("<h2>", '').replace("</h2>", '')
    }
    return token
  }

  updateState = (req, data) => {
    this.setState({
      [req]: data
    });
  }

  updateTextField = (e) => {
    let newValue = e.target.value;
    // /[^a-zA-Z0-9.\/<>?;:"'`!@#$%^&*()\[\]{}_+=|\\~\-]/
    if (/[^a-zA-Z0-9.'\-]/.test(newValue)) {
      this.setState({ errorText: `Guesses must only contain alphanumeric characters`});
    } else if (newValue.length > 30) {
      this.setState({ errorText: "Guess length must be <=30 characters" });
    } else {
      this.setState({ errorText: "" });
    }
    this.setState({ textField: e.target.value });
  }

  submitAnswer = () => {
    if (this.state.textField === "") {
      return;
    }
    let guess = this.state.textField;
    let responsePayload = {
      g: this.state.textField,
      id: this.state.teamGuesses.length + 1
    }
    let count = 0;
    this.state.article_tokens.forEach(token => {
      if (this.stripAndLowercase(token.value) === this.stripAndLowercase(guess)) {
        count += 1;
      }
    })
    this.state.answer_tokens.forEach(token => {
      if (this.stripAndLowercase(token.value) === this.stripAndLowercase(guess)) {
        count += 1;
      }
    })

    // Already guessed
    this.state.teamGuesses.forEach(teamGuess => {
      if (this.stripAndLowercase(teamGuess.g) === this.stripAndLowercase(guess)) {
        count = -1;
      }
    })

    responsePayload.r = count

    this.setState(prevState => {
      prevState.teamGuesses.push(responsePayload);
      localStorage.setItem("puzzle" + prevState.puzzleId, JSON.stringify(prevState.teamGuesses));
      
      let isSolved = false;
      let rendered_answer_tokens = prevState.answer_tokens.map(token => this.renderToken(token, guess));
      if (rendered_answer_tokens.every(token => token.value === token.render)) {
        isSolved = true;
        let solves = JSON.parse(localStorage.getItem("solves"));
        solves[prevState.puzzleId] = 1;
        localStorage.setItem("solves", JSON.stringify(solves));
      }
      let rendered_tokens = prevState.article_tokens.map(token => this.renderToken(token, guess, isSolved));
      
      return { teamGuesses: prevState.teamGuesses, textField: "", article_tokens: rendered_tokens, answer_tokens: rendered_answer_tokens, lastGuess: guess, isSolved: isSolved }
    });
  }

  switchToggle = (e) => {
    this.setState(prevState => {
      return { hideIncorrect: !prevState.hideIncorrect }
    });
  }

  render() {
      const { classes } = this.props;
      if (this.state.invalid) {
        return (<h1>Page not found :(</h1>)
      }
      return (
        <div className="PuzzlePage">
          <Paper className={classes.paper}>
          <Grid container spacing={4} style={{ paddingLeft: "20px", paddingRight: "20px" }}>
            <Grid item xs={1} key={1}>
              <NavLink activeClassName="active" className="link" to={"/puzzles/"}>
                <Button variant="contained" color="primary" className={classes.nextButton} onClick={this.nextPage} type="submit">
                  BACK
                </Button>
              </NavLink>
            </Grid>
            <Grid item xs={1} key={2}/>
            <Grid item xs={8} key={3}>
              <h1 style={{ marginBottom: "0px" }}>{"#" + this.state.puzzleId + ": " + this.state.name}</h1>
            </Grid>
            <Grid item xs={1} key={4}>
              <NavLink activeClassName="active" className="link" to={"/puzzles/" + (this.state.puzzleId - 1)}>
                  <Button variant="contained" color="primary" className={classes.nextButton} onClick={this.nextPage} disabled={this.state.puzzleId === 1} type="submit">
                      PREV
                  </Button>
                </NavLink>  
            </Grid>
            <Grid item xs={1} key={5}>
              <NavLink activeClassName="active" className="link" to={"/puzzles/" + (this.state.puzzleId + 1)}>
                <Button variant="contained" color="primary" className={classes.nextButton} onClick={this.nextPage} disabled={this.state.puzzleId >= 12} type="submit">
                    NEXT
                </Button>
              </NavLink>
            </Grid>
            </Grid>
            
            <h2 style={{ marginTop: "5px", marginBottom: "5px" }}>{this.state.pts} {this.state.pts > 1 ? "points" : "point"}</h2>
            <Divider />
            <br />
            <div className={classes.body} style={{height: '300px', padding: '10px', overflowY: 'scroll',}}>
            <center>
              {this.state.body}
              <h1 style={{marginBottom: "0px",  fontSize: "40px"}}>
              {this.state.answer_tokens.map(token => {
                if (this.stripAndLowercase(token.value) === this.stripAndLowercase(this.state.lastGuess)) {
                  return <span style={{ fontFamily: 'Courier New, Courier, monospace' }}><b><Tooltip text={`${this.stripAndLowercase(token.value).length} chars`}><span style={{backgroundColor: 'yellow'}}>{token.render}</span></Tooltip>{" "}</b></span>
                } else {
                  return <span style={{ fontFamily: 'Courier New, Courier, monospace' }}><Tooltip text={`${this.stripAndLowercase(token.value).length} chars`}><span>{token.render}</span></Tooltip>{" "}</span>
                }
                
                })}
                </h1>
              {this.state.article_tokens.map(token => {
                let h2_pattern = /<h2>.*?<\/h2>/s
                let h2_style = {fontSize: "20px", marginTop: "20px", marginBottom: "20px", display: "inline-block", fontFamily: 'Courier New, Courier, monospace'}
                let p_style = {fontFamily: 'Courier New, Courier, monospace'}
                if (this.stripAndLowercase(token.value) === this.stripAndLowercase(this.state.lastGuess)) {
                  return <span style={h2_pattern.test(token.value) ? h2_style : p_style}><b><Tooltip text={`${this.stripAndLowercase(token.value).length} chars`}><span style={{backgroundColor: 'yellow'}}>{token.render}</span></Tooltip>{" "}</b></span>
                } else if (token.value === "\n") {
                  return <br/>
                } else {
                  return <span style={h2_pattern.test(token.value) ? h2_style : p_style}><Tooltip text={`${this.stripAndLowercase(token.value).length} chars`}><span>{token.render}</span></Tooltip>{" "}</span>
                }
                
                })}
              </center>
            </div>
            <br/>
            <form autoComplete="off" onSubmit={this.submitAnswer}>
              <TextField
                autoFocus
                value={this.state.textField}
                onChange={this.updateTextField}
                error={this.state.errorText !== ""}
                id="outlined-error-helper-text"
                label={this.state.isSolved ? "Already solved!" : (this.state.textField ? `Guess (${this.state.textField.length} chars)` : "Guess")}
                defaultValue=""
                helperText={this.state.errorText}
                variant="outlined"
                disabled={this.state.isSolved}
                style = {{width: 320}}
              />
            </form>
            <br />
            <Button variant="contained" color="primary" className={classes.submitButton} onClick={this.submitAnswer} disabled={this.state.errorText || this.state.isSolved} type="submit">
              SEND
            </Button>
            <br />
            <h1 style={{ marginBottom: "0px" }}>Guesses</h1>
            <h2 style={{ marginTop: "5px", marginBottom: "5px" }}>{this.state.teamGuesses.length} guesses</h2>
            <FormControlLabel
              control={
                <Switch
                  checked={this.state.switchOn}
                  onChange={this.switchToggle}
                  name="switch"
                  color="primary"
                />
              }
              label="Hide duplicate/failed guesses"
            />
            <Divider />
            <EnhancedTableHead rows={this.state.teamGuesses} hideIncorrect={this.state.hideIncorrect} />
          </Paper>
        </div>
      );
    } 
}

export default withStyles(styles)(PuzzlePage);