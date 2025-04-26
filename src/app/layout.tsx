export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="ru">
            <head>
                <title>Голосование</title>
            </head>
            <body>{children}</body>
        </html>
    )
}
