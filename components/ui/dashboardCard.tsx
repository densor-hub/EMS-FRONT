import { Card, CardContent } from "./card"
import { DollarSign } from "lucide-react"

interface DashboardCard {
    heading: string;
    value : string
}
export function DashboardCard (prop :  DashboardCard) {
    return (
        <Card className="p-0 flex justify-center h-25">
            <CardContent className="align-center">
            <div className="flex justify-start gap-4 m-auto">
                <div className="p-2 flex justify-center rounded-lg bg-primary/10 ">
                <DollarSign className="m-auto w-10 text-primary" />
                </div>
                <div>
                <p className="text-sm font-medium text-muted-foreground">{prop.heading}</p>
                <h3 className="text-2xl font-bold">{prop.value}</h3>
                </div>
            </div>
            </CardContent>
        </Card>
    )
}