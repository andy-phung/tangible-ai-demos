import React, { useEffect, useState, useMemo, useRef } from "react";
const { GoogleGenerativeAI } = require("@google/generative-ai");

import { BlurFilter, TextStyle, Graphics } from 'pixi.js';
import { Stage, Container, PixiComponent, Sprite, Text } from '@pixi/react';

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'

import Speech from "speak-tts";

// const genAI = new GoogleGenerativeAI("YOUR_API_KEY");
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// const prompt = "Explain how AI works";

// const result = await model.generateContent(prompt);
// console.log(result.response.text());


function sleep(s) {
  return new Promise(resolve => setTimeout(resolve, s*1000));
}

// const speech = new Speech() 

// speech.init({
//   'volume': 1,
//      'lang': 'en-GB',
//      'rate': 1,
//      'pitch': 1,
//      'voice':'Google UK English Male',
//      'splitSentences': true,
//      'listeners': {
//          'onvoiceschanged': (voices) => {

//          }
//      }
// }).then((data) => {
//   // The "data" object contains the list of available voices and the voice synthesis params
//   console.log("", data)
// }).catch(e => {
//   console.error("", e)
// })

// speech.speak({
//     text: 'crashing out right now',
// }).then(() => {
//     console.log("rahh")
// }).catch(e => {
//     console.error("didn't work..", e)
// })




// stole this code
const Block = (props) => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const isDragging = useRef(false);
  const coords = useRef([]);
  const offset = useRef({x: 0, y: 0});
  const [position, setPosition] = useState({x: props.x, y: props.y});
  const position2 = useRef({x: props.x, y: props.y}); // im trolling
  const [alpha, setAlpha] = useState(1);
  // need to prevent user from moving curlybot during response
  // + add transcript in corner

  async function record_coords(fps) {
    const spf = 1/fps;

    while(isDragging.current) {
      await sleep(spf);
      coords.current.push([position2.current.x, position2.current.y]);
      //console.log(coords.current);
    }
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
      SpeechRecognition.startListening();

      offset.current = {
          x: e.data.global.x - position.x,
          y: e.data.global.y - position.y
      };
      setAlpha(0.75);
  }

  const onEnd = (e) => {
      // end audio recording, send prompt + coords array to gemini, small delay?, start tts + coords playback from response
      isDragging.current = false;
      console.log(transcript);
      SpeechRecognition.stopListening();
      setAlpha(1);
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

const Demo = () => {
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
        <Stage options={{ background: 0xffffff }} width={570} height={570} className="border-2 border-black">
          <Block x={285} y={285}/>
        </Stage>
      </div>
    );
  };



  
  export default Demo;