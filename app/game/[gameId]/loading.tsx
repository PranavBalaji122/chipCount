import { Loader2 } from "lucide-react"

export default function GameLoading() {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="animate-pulse text-sm">Loading game data...</p>
            </div>
        </div>
    )
}
