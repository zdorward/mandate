import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Decision Governance</h1>
        <p className="text-muted-foreground mt-2">
          AI-native system for structured decision-making with human accountability.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Mandate</CardTitle>
            <CardDescription>
              Define priorities, risk tolerance, and non-negotiables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/mandate">
              <Button variant="outline" className="w-full">
                Configure Mandate
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proposals</CardTitle>
            <CardDescription>
              Submit and evaluate business proposals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/proposals">
              <Button variant="outline" className="w-full">
                View Proposals
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              AI discovers risks, humans make final calls
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-1">
              <li>Set your mandate (priorities + constraints)</li>
              <li>Submit proposals for evaluation</li>
              <li>AI analyzes risks and tradeoffs</li>
              <li>Human reviews and decides</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
