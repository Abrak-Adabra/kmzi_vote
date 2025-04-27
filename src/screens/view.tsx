import Wrapper from '@/helpers/wrapper'
import Bulletin from '@/services/bulletin'
import Poll from '@/services/poll'
import Users from '@/services/users'
import { decrypt, encrypt, exportCryptKey, generateCryptKeyPair } from '@/utils/cryptKeys'
import db from '@/utils/indexedDb'
import { generateSignKeyPair, sign, verify } from '@/utils/signKeys'
import { Formik } from 'formik'
import { useState, useEffect } from 'react'
import { Button, Container, Form, ProgressBar, Spinner } from 'react-bootstrap'
import * as Yup from 'yup'

type Status = { stage: string; active: string; error?: string }
type PollType = {
    count: number
    question: {
        quest: string
        opinion: boolean
        any: boolean
    }
    answers: string[]
}

export default function ViewPage({ url }: { url: string }) {
    const [error, setError] = useState<string | null>(null)
    const [status, setStatus] = useState<Status | undefined>()
    const [current, setCurrent] = useState<string | null>(null)
    const [currents, setCurrents] = useState<string[] | null>(null)

    const [isLoadingUserAdd, setIsLoadingUserAdd] = useState<boolean>(false)

    const [poll, setPoll] = useState<PollType | null | 'none'>(null)
    const [isLoadingPoll, setIsLoadingPoll] = useState<boolean>(false)

    const [isLoadingVote, setIsLoadingVote] = useState<boolean>(false)

    const [results, setResults] = useState<string[] | null>(null)

    useEffect(() => {
        if (!url) return
        setError(null)
        const sse = new EventSource(`https://${url}:5000/status`)
        sse.onmessage = (e) => {
            try {
                setStatus((cur) => {
                    try {
                        return JSON.stringify(JSON.parse(e.data)) === JSON.stringify(cur) ? cur : JSON.parse(e.data)
                    } catch {}
                    return cur
                })
            } catch {}
        }
        sse.onerror = () => {
            sse.close()
            setError('Соединение разорвано')
        }
        return () => {
            sse.close()
        }
    }, [url])

    function shuffleArray(array: string[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1)) // Случайный индекс от 0 до i
            ;[array[i], array[j]] = [array[j], array[i]] // Обмен элементов
        }
        return array
    }

    useEffect(() => {
        if (status?.stage == 'none') db.clear_keys()
        db.getCurrent().then((result) => setCurrents(result))
        if (status?.stage == 'active' || status?.stage == 'ended') getPoll()

        if (!status?.active) return
        const currentServer = status?.active.split('/')[0]
        if (status.stage == 'decrypt') {
            if (currents?.includes(currentServer)) {
                db.getTemp(currentServer).then(async (tmp) => {
                    let bulletins = (await Bulletin.get(url)).split('::')
                    const privateCryptKey = await db.getPrivateKey(currentServer, 'crypt')
                    bulletins = await Promise.all(
                        bulletins.map(async (bulletin) => {
                            const decrypted = await decrypt(privateCryptKey, bulletin)
                            const sliced = btoa(
                                String.fromCharCode(
                                    ...new Uint8Array(Array.from(atob(decrypted)).map((i) => i.charCodeAt(0))).slice(
                                        0,
                                        -24
                                    )
                                )
                            )
                            return sliced
                        })
                    )
                    let included = false
                    for (const bulletin of bulletins) {
                        if (tmp.includes(bulletin)) included = true
                    }
                    const bulletinsToSend = shuffleArray(bulletins).join('::')
                    const signature = await sign(await db.getPrivateKey(currentServer, 'sign'), bulletinsToSend)
                    if (included) Bulletin.put(url, { id: currentServer, data: bulletinsToSend, signature: signature })
                    else alert(`нет бюллетеня ${currentServer}`)
                })
            }
        }
        if (status.stage == 'sign') {
            db.getTemp(
                String(Number(currentServer) % Number(status.active.split('/')[1]) || status.active.split('/')[1])
            ).then(async (tmp) => {
                let bulletins = (await Bulletin.get(url)).split('::')
                if (currents?.includes(currentServer)) {
                    const decryptedArray = [] as string[]
                    const privateCryptKey = await db.getPrivateKey(currentServer, 'crypt')
                    const privateSignKey = await db.getPrivateKey(currentServer, 'sign')
                    try {
                        bulletins = await Promise.all(
                            bulletins.map(async (bulletin) => {
                                if (Number(currentServer) > 1) {
                                    const gottenBulletin = Array.from(atob(bulletin)).map((i) => i.charCodeAt(0))
                                    const parsedData = btoa(String.fromCharCode(...gottenBulletin.slice(0, -256)))
                                    const parsedSignature = btoa(String.fromCharCode(...gottenBulletin.slice(-256)))
                                    const isValid = verify(
                                        await Users.getPsk(url, currentServer),
                                        parsedSignature,
                                        parsedData
                                    )
                                    if (!isValid) throw 'Ошибка при проверке подписи'
                                    bulletin = parsedData
                                }
                                const decrypted = await decrypt(privateCryptKey, bulletin)
                                decryptedArray.push(decrypted)
                                const transitionalSignature = await sign(privateSignKey, decrypted)
                                const result = btoa(
                                    String.fromCharCode(
                                        ...new Uint8Array([
                                            ...Array.from(atob(decrypted)).map((i) => i.charCodeAt(0)),
                                            ...Array.from(atob(transitionalSignature)).map((i) => i.charCodeAt(0)),
                                        ])
                                    )
                                )
                                return result
                            })
                        )
                        let included = false
                        for (const bulletin of decryptedArray) {
                            if (tmp.includes(bulletin)) included = true
                        }
                        if (!included) throw `нет бюллетеня ${currentServer}`
                        const bulletinsToSend = bulletins.join('::')
                        const signature = await sign(await db.getPrivateKey(currentServer, 'sign'), bulletinsToSend)
                        if (included)
                            Bulletin.put(url, { id: currentServer, data: bulletinsToSend, signature: signature })
                        else throw `нет бюллетеня ${currentServer}`
                    } catch (e) {
                        alert(e)
                    }
                } else if (currents?.includes(String(Number(currentServer) % Number(status.active.split('/')[1])))) {
                    const signedArray = [] as string[]
                    try {
                        bulletins = await Promise.all(
                            bulletins.map(async (bulletin) => {
                                const gottenBulletin = Array.from(atob(bulletin)).map((i) => i.charCodeAt(0))
                                const parsedData = btoa(String.fromCharCode(...gottenBulletin.slice(0, -256)))
                                const parsedSignature = btoa(String.fromCharCode(...gottenBulletin.slice(-256)))
                                const isValid = verify(await Users.getPsk(url, '1'), parsedSignature, parsedData)
                                if (!isValid) throw 'Ошибка при проверке подписи'
                                bulletin = parsedData
                                signedArray.push(bulletin)
                                const result = new TextDecoder().decode(
                                    new Uint8Array(
                                        Array.from(atob(bulletin))
                                            .map((i) => i.charCodeAt(0))
                                            .slice(0, -24)
                                    )
                                )
                                return result
                            })
                        )
                        let included = false
                        for (const bulletin of signedArray) {
                            if (tmp.includes(bulletin)) included = true
                        }
                        if (!included) throw `нет бюллетеня 1`
                        const bulletinsToSend = bulletins.join('::')
                        const signature = await sign(await db.getPrivateKey('1', 'sign'), bulletinsToSend)
                        if (included)
                            Bulletin.put(url, { id: currentServer, data: bulletinsToSend, signature: signature })
                        else throw `нет бюллетеня 1`
                    } catch (e) {
                        alert(e)
                    }
                }
            })
        }
        if (status.stage == 'ended') Bulletin.get(url).then((result) => setResults(result.split('::')))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status])

    async function takePart() {
        setIsLoadingUserAdd(true)
        try {
            const cryptKeyPair = await generateCryptKeyPair()
            const signKeyPair = await generateSignKeyPair()
            if (!cryptKeyPair || !signKeyPair) throw 'ключи не созданы'
            const deliveredCryptPublicKey = await exportCryptKey(cryptKeyPair.publicKey)
            const deliveredSignPublicKey = await exportCryptKey(signKeyPair.publicKey)
            if (!deliveredCryptPublicKey || !deliveredSignPublicKey) throw 'ключи не экспортированы'
            const id = await Users.add(url, { pck: deliveredCryptPublicKey, psk: deliveredSignPublicKey })
            if (Number.isNaN(Number(id))) throw 'регистрация не состоялась'
            db.addKeys(id, cryptKeyPair, signKeyPair)
            db.getCurrent().then((result) => setCurrents(result))
        } catch (e) {
            alert(e)
        } finally {
            setIsLoadingUserAdd(false)
        }
    }

    async function getPoll() {
        setIsLoadingPoll(true)
        try {
            const data = await Poll.getPoll(url)
            setPoll(() => {
                const q = data.question?.split('::')
                if (q)
                    return {
                        count: data.count,
                        question: {
                            quest: q?.[0],
                            opinion: JSON.parse(q?.[1]),
                            any: JSON.parse(q?.[2]),
                        },
                        answers: data.answers?.split('::'),
                    }
                return 'none'
            })
        } catch {
            setError('Проблемы с получением настроек голосования')
        } finally {
            setIsLoadingPoll(false)
        }
    }

    if (!status && !error) {
        return (
            <Wrapper>
                <Spinner style={{ height: 100, width: 100 }} animation="grow" />
            </Wrapper>
        )
    }
    if (error) {
        return (
            <Wrapper>
                <h1 style={{ color: 'darkred' }}>{error}</h1>
            </Wrapper>
        )
    }

    if (status?.stage == 'init') {
        return (
            <Container style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', height: '100%' }}>
                <h1>Регистрация на голосование</h1>
                <Wrapper>
                    <Button size="lg" onClick={takePart} disabled={isLoadingUserAdd}>
                        Участвовать {currents && currents.length > 0 ? 'ещё' : ''}
                    </Button>
                    <h4>Зарегистрированы: </h4>
                    <div
                        style={{
                            overflowY: 'auto',
                            height: '40vh',
                            width: '40vw',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}>
                        {currents?.map((id, index) => (
                            <p key={index}>Участник {id}</p>
                        ))}
                    </div>
                </Wrapper>
            </Container>
        )
    }

    function generateRandomString(length: number = 24) {
        let result = ''
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        const charactersLength = characters.length
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength))
        }
        return new Uint8Array(new TextEncoder().encode(result))
    }

    async function vote(bulletin: string) {
        if (poll == 'none' || !poll || !current) return
        setIsLoadingVote(true)
        try {
            const pck = await Users.getPck(url)
            const tmp = []
            let bulletinForSend = btoa(
                String.fromCharCode(
                    ...new Uint8Array([...new TextEncoder().encode(bulletin), ...generateRandomString()])
                )
            )
            tmp.push(bulletinForSend)
            for (let i = Number(poll.count); i > 0; i--) {
                bulletinForSend = await encrypt(pck[`${i}`], bulletinForSend)
                tmp.push(bulletinForSend)
            }
            for (let i = Number(poll.count); i > 0; i--) {
                bulletinForSend = btoa(
                    String.fromCharCode(
                        ...new Uint8Array([
                            ...Array.from(atob(bulletinForSend)).map((i) => i.charCodeAt(0)),
                            ...generateRandomString(),
                        ])
                    )
                )
                bulletinForSend = await encrypt(pck[`${i}`], bulletinForSend)
                tmp.push(bulletinForSend)
            }

            const data = tmp[8]
            const privateSignKey = await db.getPrivateKey(current, 'sign')
            const signature = await sign(privateSignKey, data)
            alert(await Bulletin.post(url, { id: current, data: data, signature: signature }))
            db.addTemp(current, tmp)
            setCurrent('0')
        } catch (e) {
            alert('Проблемы при голосовании ' + e)
        } finally {
            setIsLoadingVote(false)
        }
    }

    if (status?.stage == 'active' && currents) {
        if (currents.length == 1) setCurrent(currents[0])
        return (
            <Container style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', height: '100%' }}>
                <h1> Голосование</h1>
                {currents?.length && currents.length > 1 ? (
                    <Form.Select onChange={(e) => setCurrent(e.target.value)} value={current || '0'}>
                        <option value={'0'}>Выберите голосующего участника</option>
                        {currents?.map((id, index) => (
                            <option key={index} value={id}>
                                Участник {id}
                            </option>
                        ))}
                    </Form.Select>
                ) : (
                    `Участник ${current}`
                )}
                <Wrapper>
                    {(isLoadingPoll || Number(current) == 0 || !current) && (
                        <Wrapper>
                            <h1 style={{ color: 'darkred' }}>Выберите участника</h1>
                        </Wrapper>
                    )}
                    {!isLoadingPoll && current && Number(current) > 0 && poll && poll != 'none' && (
                        <Formik
                            initialValues={{ answers: '', opinion: '' }}
                            validationSchema={Yup.object().shape({
                                opinion: Yup.string().test({
                                    test: (value) => !value?.includes('::'),
                                    message: 'Нельзя использовать технические символы',
                                }),
                            })}
                            validateOnMount
                            onSubmit={(e) => {
                                const bulletin = [e.opinion, e.answers].filter((ans) => ans != '').join('::')
                                if (!bulletin) {
                                    alert('Нельзя голосовать пустым бюллетенем')
                                    return
                                }
                                vote(bulletin)
                            }}>
                            {({ handleSubmit, handleChange, setFieldValue, values, errors }) => (
                                <>
                                    <h1>{poll.question.quest}</h1>
                                    <div
                                        style={{
                                            overflowY: 'auto',
                                            height: '40vh',
                                            width: '60vw',
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }}>
                                        {poll.answers.filter(Boolean).map((answer, index) => (
                                            <Form.Check
                                                name={`answers`}
                                                style={{ paddingLeft: 50, fontSize: '30px', minHeight: 32 }}
                                                type={poll.question.any ? 'checkbox' : 'radio'}
                                                key={index}
                                                label={answer}
                                                checked={values.opinion.length > 0 ? false : undefined}
                                                defaultChecked={false}
                                                onChange={() =>
                                                    poll.question.any
                                                        ? setFieldValue(
                                                              'answers',
                                                              values.answers.split('::').includes(answer)
                                                                  ? values.answers
                                                                        .split('::')
                                                                        .filter((ans) => ans != answer)
                                                                        .join('::')
                                                                  : values.answers
                                                                        .split('::')
                                                                        .filter((ans) => ans != '')
                                                                        .concat(answer)
                                                                        .join('::')
                                                          )
                                                        : setFieldValue('answers', answer)
                                                }
                                                id="answers"
                                            />
                                        ))}
                                        {poll.question.opinion && (
                                            <>
                                                <Form.Control
                                                    name="opinion"
                                                    defaultValue={''}
                                                    value={values.opinion}
                                                    onChange={(e) => {
                                                        if (!poll.question.any && values.answers)
                                                            setFieldValue('answers', '')
                                                        handleChange(e)
                                                    }}
                                                    style={{ width: '90%', alignSelf: 'center', marginBlock: 20 }}
                                                    size="lg"
                                                    isInvalid={!!errors.opinion}
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {errors.opinion}
                                                </Form.Control.Feedback>
                                            </>
                                        )}
                                    </div>
                                    <Button disabled={!values || isLoadingVote} onClick={() => handleSubmit()}>
                                        Проголосовать
                                    </Button>
                                </>
                            )}
                        </Formik>
                    )}
                </Wrapper>
            </Container>
        )
    }

    if (status?.stage == 'ended') {
        if (!poll || poll == 'none') return
        return (
            <Container style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', height: '100%' }}>
                <h1>Голосование окончено</h1>
                <h3>{poll.question.quest}</h3>
                <Wrapper>
                    <h4>Результаты: </h4>
                    <div
                        style={{
                            overflowY: 'auto',
                            height: '40vh',
                            width: '40vw',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            rowGap: 10,
                        }}>
                        {Object.entries(
                            results?.reduce<{ [answer: string]: number }>((acc, answer) => {
                                acc[answer] = (acc[answer] || 0) + 1
                                return acc
                            }, {}) || {}
                        ).map(([answer, count]) => (
                            <div key={answer} style={{ display: 'flex', width: '100%' }}>
                                <ProgressBar
                                    now={(count / Number(poll.count)) * 100}
                                    label={answer}
                                    style={{ width: '100%', height: 40, fontSize: 30 }}
                                />
                            </div>
                        ))}
                    </div>
                </Wrapper>
            </Container>
        )
    }

    return (
        <Wrapper>
            <div>
                <h1 style={{ color: 'darkslateblue' }}>
                    {(() => {
                        if (!status) return
                        const [current, count] = status.active.split('/').map((i) => Number(i))
                        switch (status.stage) {
                            case 'none':
                                return 'Голосование ещё не началось'
                            case 'active':
                                return `Проголосовали: ${status.active}`
                            case 'decrypt':
                                return `Расшифровывает: ${status.active}`
                            case 'sign':
                                if (current <= count) return `Подписывает: ${status.active}`
                                else return `1-ый проверяет подпись`
                        }
                    })()}
                </h1>
            </div>
        </Wrapper>
    )
}
