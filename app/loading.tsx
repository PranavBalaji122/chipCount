export default function Loading() {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                <p className="text-muted-foreground animate-pulse text-sm">Loading...</p>
            </div>
        </div>
    )
}
