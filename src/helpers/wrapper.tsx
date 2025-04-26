export default function Wrapper({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
            }}>
            {children}
        </div>
    )
}
