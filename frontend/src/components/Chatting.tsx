'use client'

import useIngameStore from '@/stores/ingameStore'
import useUserStore from '@/stores/userStore'
import { Client, IFrame, IMessage } from '@stomp/stompjs'
import { useEffect, useRef, useState } from 'react'
import { IoIosSend } from 'react-icons/io'
import styles from './chatting.module.css'

interface MessageRespnose {
  senderDateTime: string
  senderNickname: string
  senderGameId: number
  senderTeamId: number
  code: number
  msg: string
  content: string
}

interface ChattingProps {
  chatTitle: string
  subscribeUrl: string
  publishUrl: string
  gameId: string
}

export default function Chatting({
  chatTitle,
  subscribeUrl,
  publishUrl,
  gameId,
}: ChattingProps) {
  const [messages, setMessages] = useState<MessageRespnose[]>([])
  const [newMessage, setNewMessage] = useState<string>('')
  const chatContainerRef = useRef<HTMLDivElement | null>(null)

  const clientRef = useRef<Client>(
    new Client({
      brokerURL: process.env.NEXT_PUBLIC_SERVER_SOCKET_URL,
      debug: function (str: string) {
        console.log(str)
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    }),
  )

  const { nickname } = useUserStore()
  const { teamId } = useIngameStore()

  useEffect(() => {
    clientRef.current.onConnect = function (_frame: IFrame) {
      clientRef.current.subscribe(subscribeUrl, (message: IMessage) => {
        const messageResponse = JSON.parse(message.body) as MessageRespnose
        if (messageResponse.code == 1001 || messageResponse.code == 1119)
          setMessages((prevMessages) => [...prevMessages, messageResponse])
      })
    }

    clientRef.current.onStompError = function (frame: IFrame) {
      console.log('Broker reported error: ' + frame.headers['message'])
      console.log('Additional details: ' + frame.body)
    }

    clientRef.current.activate()

    return () => {
      clientRef.current.deactivate()
    }
  }, [subscribeUrl, publishUrl])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = () => {
    const trimmedMessage = newMessage.trim()
    if (!trimmedMessage) {
      setNewMessage('')
      return
    }
    if (clientRef.current) {
      clientRef.current.publish({
        headers: {
          Auth: localStorage.getItem('accessToken') as string,
        },
        destination: publishUrl,
        body: JSON.stringify({
          senderNickname: nickname,
          senderGameId: gameId,
          senderTeamId: teamId,
          content: trimmedMessage,
        }),
      })
    }
    setNewMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }

  return (
    <>
      <div className={styles.chatTitle}>{chatTitle}</div>
      <div className={styles.chatList} ref={chatContainerRef}>
        {messages.map((message, index) => (
          <div
            className={
              message.senderNickname != nickname
                ? `${styles.chatContainer}`
                : `${styles.myChatContainer}`
            }
            key={index}
          >
            <div className={styles.chatSender}>{message.senderNickname}</div>
            <div
              className={
                message.senderNickname != nickname
                  ? `${styles.chatContent}`
                  : `${styles.myChatContent}`
              }
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.send}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="채팅을 입력하세요..."
          onKeyDown={handleKeyDown}
        />
        <div onClick={handleSendMessage}>
          <IoIosSend />
        </div>
      </div>
    </>
  )
}
