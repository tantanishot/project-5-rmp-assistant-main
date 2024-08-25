'use client'
import { Box, Button, Stack, TextField } from '@mui/material'
import { useEffect, useState, useRef} from 'react'

function validUrl (message : string) {
  let url;
  try {
    url = new URL(message);
  } catch(_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm the Rate My Professor support assistant. How can I help you today?`,
    },
  ])
  const [message, setMessage] = useState('');

  const bottomScroll = useRef(null);

  useEffect(() => {
    if (bottomScroll.current) {
      bottomScroll.current.scrollIntoView({behavior: 'smooth'});
    }
  }, [messages]);

  const sendMessage = async () => {
    setMessage('')
    setMessages((messages) => [
      ...messages,
      {role: 'user', content: message},
      {role: 'assistant', content: ''},
    ])
    
    if (validUrl(message)) {
      const response = fetch('/api/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, {role: 'user', content: message}]),
      })

      setMessages((messages) => {
        let lastMessage = messages[messages.length - 1]
        let otherMessages = messages.slice(0, messages.length - 1)
        return [
          ...otherMessages,
          {...lastMessage, content: lastMessage.content + message},
        ]
      })
      return
    } else {
      const response = fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, {role: 'user', content: message}]),
      }).then(async (res) => {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let result = ''
    
        return reader.read().then(function processText({done, value}) {
          if (done) {
            return result
          }
          const text = decoder.decode(value || new Uint8Array(), {stream: true})
          setMessages((messages) => {
            let lastMessage = messages[messages.length - 1]
            let otherMessages = messages.slice(0, messages.length - 1)
            return [
              ...otherMessages,
              {...lastMessage, content: lastMessage.content + text},
            ]
          })
          return reader.read().then(processText)
        })
      })
    }

    
  }

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <Stack
        direction={'column'}
        width="500px"
        height="700px"
        borderRadius="16px"
        boxShadow="0 0 150px skyBlue"
        p={2}
        spacing={3}
      >
        <Stack
          direction={'column'}
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === 'assistant' ? 'flex-start' : 'flex-end'
              }
            >
              <Box
                maxWidth="75%"
                bgcolor={
                  message.role === 'assistant'
                    ? 'primary.light'
                    : 'error.light'
                }
                borderRadius= {
                  message.role === 'assistant' ? "16px 16px 16px 0px" : "16px 16px 0px 16px"
                }
                color="white"
                p={3}
              >
                {message.content}
              </Box>
            </Box>
          ))}
          <div ref={bottomScroll}></div>
        </Stack>
        <Stack direction={'row'} spacing={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(ev) => {
              console.log(`Pressed keyCode ${ev.key}`);
              if (ev.key === 'Enter') {
                sendMessage()
                ev.preventDefault()
              }
            }}
          />
          <Button variant="contained" onClick={sendMessage}>
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}