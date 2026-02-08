import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Chat from '@/components/Chat'
import Footer from '@/components/Footer'
import ConversationSidebar from '@/components/ConversationSidebar'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Footer />
      <Chat />
      <ConversationSidebar />
    </main>
  )
}
