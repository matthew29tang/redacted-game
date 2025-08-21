import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Divider from '@material-ui/core/Divider';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import { NavLink } from "react-router-dom";
import styles from './commonStyles.js';
import { ThemeContext } from "./util/config.js";

class Home extends React.Component {
  static contextType = ThemeContext;

  constructor(props) {
    super(props);
    this.images = [];
  }

  render() {
    const { classes } = this.props;
    return (
      <div className="Home">
        <Paper className={classes.paper}>
          <h2>Redacted!</h2>
          <Divider />
          <h3 style={{ marginBottom: "0px" }}>You've received a set of incoming transmissions (Wikipedia articles), but the data has been corrupted! <br/>Guess words that are in the article to guess the article name. <br/> A puzzle is solved if the article name is guessed.</h3>
          <div> <br/>
          <h3>Rules:</h3>
          {`1) You are allowed to use the internet and any online tools, with exceptions listed in (2).`}
          <br/>
          2) The only LLM that is allowed is <b>Gemini 2.5 Flash</b> or <b>AI Overview via Google Search</b> (no ChatGPT, Claude, etc.).
          <br/>
          {`3) Guesses must only contain alphanumeric characters (. - ' are also allowed). Guess one word/number at a time.`}    
          <br/>
          {`4) Article names exist on Wikipedia. Excerpts of the article is provided (excerpts are not always contiguous)`}
          <br/>
          {`5) The puzzle name and flavortext are related to the article name.`}
          <br /> <br/>
          </div>
          <div><NavLink activeClassName="active" className="link" to={"/puzzles"} type="menu">
            <Button variant="contained" color="primary" className={classes.button}>
              Puzzles
            </Button>
          </NavLink><br /> <br /></div>
        </Paper>
      </div>
    );
  }
}


export default withStyles(styles)(Home);