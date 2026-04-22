import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import LogoutButton from './logout-button'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">StudentSpace</h1>
            <p className="text-muted-foreground mt-1">
              Hello, {profile?.full_name ?? user.email}
              {profile?.role && ` (${profile.role})`}
            </p>
          </div>
          <LogoutButton />
        </div>

        <p className="text-muted-foreground">
          Welcome. This is where your dashboard will live.
        </p>
      </div>
    </main>
  )
}