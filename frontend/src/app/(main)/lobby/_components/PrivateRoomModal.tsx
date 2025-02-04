'use client'

import useCustomAlert from '@/components/useCustomAlert'
import useUserStore from '@/stores/userStore'
import { Client, IFrame, IMessage } from '@stomp/stompjs'
import { useRouter } from 'next/navigation'
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import { IoIosLock } from 'react-icons/io'
import styles from '../lobby.module.css'

interface PrivateRoomModalProps {
  gameId: number
  roomName: string
  setShowModal: Dispatch<SetStateAction<boolean>>
  clickSound: () => void
}

export default function PrivateRoomModal({
  gameId,
  roomName,
  setShowModal,
  clickSound,
}: PrivateRoomModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [password, setPassword] = useState<string>('')
  const router = useRouter()
  const { error } = useCustomAlert()

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value)
  }
  // 소켓 연결
  const clientRef = useRef<Client>(
    new Client({
      brokerURL: process.env.NEXT_PUBLIC_SERVER_SOCKET_URL,
      debug: function (str: string) {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    }),
  )
  const subscribeRoomUrl = `/game/${gameId}`
  const publishUserUrl = `/app/game/enter/${gameId}`
  const { nickname } = useUserStore()

  useEffect(() => {
    showModal()
    clientRef.current.onConnect = function (_frame: IFrame) {
      // 메시지 구독
      clientRef.current.subscribe(
        subscribeRoomUrl,
        async (message: IMessage) => {
          const enterResponse = JSON.parse(message.body)
          // console.log(enterResponse)
        },
      )
    }
    clientRef.current.onStompError = function (frame: IFrame) {
      // console.log('Broker reported error: ' + frame.headers['message'])
      // console.log('Additional details: ' + frame.body)
    }

    clientRef.current.activate()

    return () => {
      clientRef.current.deactivate()
    }
  }, [])

  const showModal = () => {
    dialogRef.current?.showModal()
  }

  const closeModal = () => {
    setShowModal(false)
    dialogRef.current?.close()
  }

  const enterPassword = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/lobby/${gameId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${
              localStorage.getItem('accessToken') as string
            }`,
          },
          body: JSON.stringify({
            password: password,
          }),
        },
      )

      if (response.ok) {
        // console.log('비밀방 입장 요청 통신 성공')
        const responseData = await response.json()
        if (responseData.code === 1000) {
          // console.log('비밀방 입장 요청 성공!', responseData)
          clientRef.current.publish({
            headers: {
              Auth: localStorage.getItem('accessToken') as string,
            },
            destination: publishUserUrl,
            body: JSON.stringify({
              senderNickname: nickname,
            }),
          })
          // console.log(`${gameId}번 방으로 입장합니다`)
          router.push(`/room/${gameId}`)
        } else {
          // console.log('비밀방 입장 요청 실패!', responseData.code)
          error(responseData.message)
        }
      } else {
        // console.error('비밀방 입장 요청 통신 실패', response)
      }
    } catch (error) {
      // console.error('에러 발생: ', error)
    }
    clickSound()
  }

  return (
    <dialog className={styles.privateRoomModalWrapper} ref={dialogRef}>
      <p className={styles.modalTitle}>{roomName}</p>
      <hr className={styles.line} />
      <div className={styles.passwordWrapper}>
        <IoIosLock />
        <input
          className={styles.inputText}
          type="text"
          value={password}
          placeholder="비밀번호를 입력해 주세요"
          onChange={handlePasswordChange}
        />
      </div>
      <div className={styles.modalButtons}>
        <p className={styles.exit} onClick={closeModal}>
          취소
        </p>
        <p className={styles.start} onClick={enterPassword}>
          입장 ➜
        </p>
      </div>
    </dialog>
  )
}
