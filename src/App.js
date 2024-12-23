import React, { useEffect, useState, useMemo, useRef } from "react";

import { BlurFilter, TextStyle, Graphics } from 'pixi.js';
import { Stage, Container, PixiComponent, Sprite, Text } from '@pixi/react';

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'

import Speech from "speak-tts";

const { GoogleGenerativeAI } = require("@google/generative-ai");

function sleep(s) {
  return new Promise(resolve => setTimeout(resolve, s*1000));
}

const genAI = new GoogleGenerativeAI("AIzaSyBRuQoJFq33HnFq4A8BNAg6Mci3ppvYTC0");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const tts = new Speech() 
tts.init({
  'volume': 1,
     'lang': 'en-GB',
     'rate': 1,
     'pitch': 1,
     'voice':'Google UK English Male',
     'splitSentences': true,
     'listeners': {
         'onvoiceschanged': (voices) => {

         }
     }
});




const prompt_prefix = `You are a desktop robot named Curlybot, who can intelligently complete gestures started by a user moving you across a surface and talking to you. These gestures may be stories, songs, etc.\n\nAn example of user input is as follows, between the two "----" dividers:\n----\nSpeech: "Hello! I'm Curlybot."\nMovement: "[[0, 0], [20, 20], [40, 20], [40, 40], [41, 43]]"\n----\nYour position is represented as an (x, y) coordinate on a 570 by 570 grid, where the top left corner is (0, 0). Your coordinates are given at a frame rate of 2 fps in the user input. Either field may be empty if the user does not move you or talk while moving you.\n\nGiven the following movement and speech from a user, continue their gesture by responding in the following output format, between the two "----" dividers:\n----\nSpeech: [output speech goes here]\nMovement: [output movement coordinates go here]\n----\nThe output movement coordinates must begin with the last coordinate in the user input, and may be as long as you deem necessary. Your output speech may contain dialogue, questions, statements, etc.\n\n`;




// stole this code
const Block = (props) => {
  

  const isDragging = useRef(false);
  const coords = useRef([]);
  const offset = useRef({x: 0, y: 0});
  const [position, setPosition] = useState({x: props.x, y: props.y});
  const position2 = useRef({x: props.x, y: props.y}); // im trolling
  const [alpha, setAlpha] = useState(1);
  // need to prevent user from moving curlybot during response
  // + add transcript in corner

  async function play_movement(coords, fps, in_betweens) {
    // -> number of in betweens between each frame
    const spf = 1/fps;
    const subdivs = spf/in_betweens;

    for (let i = 0; i < coords.length; i++) {
      if(i < coords.length-1) {
        for (let j = 1; j <= in_betweens; j++) {
          await sleep(subdivs);
          setPosition({
                      x: coords[i][0] + ((coords[i+1][0] - coords[i][0])/in_betweens) * j, 
                      y: coords[i][1] + ((coords[i+1][1] - coords[i][1])/in_betweens) * j
                      });

        }
      }
    }

      


  };

  async function record_coords(fps) {
    const spf = 1/fps;

    while(isDragging.current) {
      await sleep(spf);
      coords.current.push([position2.current.x, position2.current.y]);
      //console.log(coords.current);
    }
  };

  async function prompt(coords, speech) {
    const prompt = prompt_prefix + `Please respond to this movement and speech from a user:\nSpeech: "${speech}"\nMovement: "${JSON.stringify(coords)}"`;
    const result = await model.generateContent(prompt);
    const result_string = result.response.text();
    console.log(result_string);

    const response_speech = result_string.match(/"(.*?)"/g)[0];
    const response_coords = JSON.parse(result_string.match(/"(.*?)"/g)[1].slice(1, -1));

    props.setText(response_speech.slice(1, -1));
  
    tts.speak({
        text: response_speech,
    });
    play_movement(response_coords, 2, 20);
  }

  useEffect(() => {
    record_coords(2);
  }, [isDragging.current]);


  const onStart = (e) => {

      // i need a way to record coords in a set fps bruh
      // + function to play back coords from gemini in that fps, w/ in betweens

      // start audio recording, clear coords array
      isDragging.current = true;
      coords.current = [];
      props.startListening();

      offset.current = {
          x: e.data.global.x - position.x,
          y: e.data.global.y - position.y
      };
      setAlpha(0.75);
  }

  const onEnd = (e) => {
      // end audio recording, send prompt + coords array to gemini, small delay?, start tts + coords playback from response
      isDragging.current = false;
      const speech = props.transcript;
      props.stopListening();
      setAlpha(1);

      prompt(coords.current, speech);

  }

  const onMove = (e) => {
      if (isDragging.current) {
          setPosition({
              x: e.data.global.x - offset.current.x,
              y: e.data.global.y - offset.current.y
          });
          position2.current = {
            x: e.data.global.x - offset.current.x,
            y: e.data.global.y - offset.current.y
          };
      }
  }

  const Rectangle = PixiComponent('Rectangle', {
      create: () => new Graphics(),
      applyProps: (ins, _) => {
          ins.beginFill(0x000000)
          ins.lineStyle(1, '0x000000')
          //ins.drawRoundedRect(0, 0, 150, 150, 10)
          ins.drawCircle(0, 0, 30)
          ins.endFill()
          ins.eventMode = "static"
          ins.on("globalpointermove", onMove)
      },
  })


  return (
      <Container
          eventMode={"static"}
          position={position}
          pointerdown={onStart}
          pointerup={onEnd}
          pointerupoutside={onEnd}
          alpha={alpha}
      >
          <Rectangle/>
      </Container>
  )
}

const App = () => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  useEffect(() => {
    setText(`"${transcript}"`)
  }, [transcript]);

  const [text, setText] = useState("");

  async function api_call() {
    const genAI = new GoogleGenerativeAI("AIzaSyBRuQoJFq33HnFq4A8BNAg6Mci3ppvYTC0");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = "Explain how AI works";

    const result = await model.generateContent(prompt);
    console.log(result.response.text());
  };

  useEffect(() => {
    //api_call();
  }, []);

  return (
      <div className="w-screen h-screen flex justify-center items-center">
        <div className="absolute top-[100px]">
          {text}
        </div>
        <Stage options={{ background: 0xffffff }} width={570} height={570} className="border-2 border-black">
          <Block x={285} y={285} transcript={transcript} startListening={SpeechRecognition.startListening} stopListening={SpeechRecognition.stopListening} setText={setText}/>
        </Stage>
      </div>
    );
  };

export default App;
