import { Formik } from 'formik'
import { useEffect, useState } from 'react'
import { Container, Form, Button } from 'react-bootstrap'
import * as Yup from 'yup'
import ViewPage from './view'

export default function MainPage() {
    const [url, setUrl] = useState<string>('')

    useEffect(() => {
        const url = localStorage.getItem('url')
        if (url) setUrl(url)
    }, [])

    return (
        <Container
            style={{ display: 'flex', flexDirection: 'column', rowGap: '20px', paddingBlock: '20px', height: '100%' }}>
            <Formik
                initialValues={{ url: url }}
                onSubmit={(e) => setUrl(e.url)}
                validationSchema={Yup.object().shape({
                    url: Yup.string()
                        .nullable()
                        .required('не может быть пустым')
                        .matches(
                            /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/,
                            'Неверный формат IP-адреса'
                        ),
                })}
                validateOnBlur
                enableReinitialize>
                {({ handleChange, values, handleSubmit, errors }) => {
                    return (
                        <Form.Group
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                rowGap: 10,
                            }}>
                            <Form.Label>Введите ip-адрес для подключения</Form.Label>
                            <Form.Control
                                name="url"
                                onChange={handleChange}
                                value={values.url}
                                isInvalid={!!errors.url}></Form.Control>
                            <Form.Control.Feedback type="invalid">{errors.url}</Form.Control.Feedback>
                            <Button
                                disabled={!!errors.url}
                                type="submit"
                                onClick={() => {
                                    handleSubmit()
                                    localStorage.setItem('url', values.url)
                                }}>
                                Подтвердить
                            </Button>
                        </Form.Group>
                    )
                }}
            </Formik>
            <ViewPage url={url} />
        </Container>
    )
}
