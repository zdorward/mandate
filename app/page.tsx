import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="space-y-12">
      <div className="space-y-4 pt-8">
        <h1 className="text-4xl font-bold tracking-tight">Decision Governance</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          AI-native system for structured decision-making. AI owns risk discovery. Humans retain accountability.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-white border-border hover:border-primary/50 hover:shadow-md transition-all">
          <CardHeader className="space-y-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center mb-2">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <CardTitle className="text-xl">Mandate</CardTitle>
            <CardDescription className="text-muted-foreground">
              Define priorities, risk tolerance, and non-negotiables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/mandate">
              <Button className="w-full bg-foreground hover:bg-foreground/90 text-background">
                Configure Mandate
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-border hover:border-primary/50 hover:shadow-md transition-all">
          <CardHeader className="space-y-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center mb-2">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <CardTitle className="text-xl">Proposals</CardTitle>
            <CardDescription className="text-muted-foreground">
              Submit and evaluate business proposals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/proposals">
              <Button className="w-full bg-foreground hover:bg-foreground/90 text-background">
                View Proposals
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-border">
          <CardHeader className="space-y-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center mb-2">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <CardTitle className="text-xl">How It Works</CardTitle>
            <CardDescription className="text-muted-foreground">
              AI discovers risks, humans make final calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">1</span>
                <span className="text-muted-foreground">Set your mandate (priorities + constraints)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">2</span>
                <span className="text-muted-foreground">Submit proposals for evaluation</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">3</span>
                <span className="text-muted-foreground">AI analyzes risks and tradeoffs</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">4</span>
                <span className="text-muted-foreground">Human reviews and decides</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
