import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('users').select('*')

  return (
    <main style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>StudentSpace</h1>
      <p>Supabase connection test:</p>
      {error ? (
        <pre style={{ color: 'red' }}>{JSON.stringify(error, null, 2)}</pre>
      ) : (
        <pre>Found {data?.length ?? 0} users in the database.</pre>
      )}
    </main>
  )
}