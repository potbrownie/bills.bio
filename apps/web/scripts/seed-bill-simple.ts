/**
 * Simple Bill Profile Seed - 4 Table Version
 */

import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function seedBillProfile() {
  console.log('🌱 Seeding Bill\'s profile...\n')

  try {
    const billData = {
      bio: "Founder of Instinct. Building service robots for hospitality. 24, grew up in Brisbane after moving from China.",
      avatar: 'https://i.namu.wiki/i/djtuzk91thpExQ-G-ZGu20SJzIxyyvVUsF04bdNImmwW5pYvpDJ6vJMJni1ZiixHsbmGm2iY5wj9XPJISbYzPg.webp',
      age: 24,
      background: {
        origin: 'China',
        immigrated_to: 'Australia',
        grew_up_in: 'Brisbane',
        context: 'Moved from China to Australia as a kid, grew up in Brisbane. Started tinkering with robotics and AI early on.',
        education: 'Self-taught in robotics and AI, learned by building things'
      },
      location: {
        city: 'Brisbane',
        country: 'Australia',
        timezone: 'Australia/Brisbane',
        notes: 'Based in Brisbane but travel for work'
      },
      professional: {
        title: 'Founder & CEO',
        company: 'Instinct',
        industry: ['Robotics', 'AI', 'Hospitality', 'Automation'],
        website: 'https://bills.bio',
        company_description: 'Building service robots for the hospitality industry',
        company_stage: 'Funded startup with pilot deployments',
        technical_stack: ['Python', 'C++', 'ROS', 'Computer Vision', 'Machine Learning'],
        focus_areas: [
          'Robotic manipulation in unstructured environments',
          'Autonomous navigation in dynamic spaces',
          'Perception and computer vision',
          'Human-robot interaction'
        ]
      },
      socials: {
        twitter: '@billhuang',
        linkedin: 'bill-h-604a82111',
        github: 'billhuang',
        instagram: '@shaospun',
        email: 'bill@instinct.com'
      },
      interests: {
        technical: [
          'Robotic manipulation',
          'AI agents',
          'Computer vision',
          'Autonomy',
          'Human-robot interaction'
        ],
        personal: [
          {
            name: 'Design',
            focus: 'Timeless, minimal design',
            favorite: "Apple's logo blueprint - simple, timeless, says everything with almost nothing"
          },
          {
            name: 'Aviation',
            focus: 'Military aircraft, engineering',
            favorite: 'F14 Tomcat - most advanced of its time, brutal and beautiful'
          },
          {
            name: 'Soviet Nuclear Bunkers',
            focus: 'Cold War era architecture',
            favorite: 'Javor-51 - best preserved Soviet bunker, can feel the Cold War tension in those walls'
          },
          {
            name: 'Snowboarding',
            focus: 'Powder skiing, Japan',
            favorite: 'Japow (Japan powder) - light, deep, keeps coming. Best snow on the planet'
          },
          {
            name: 'Photography',
            focus: 'Leica cameras, optics',
            favorite: 'Leica - the optics and build quality, nothing else comes close'
          },
          {
            name: 'Model Railways',
            focus: 'HO scale, detailed builds',
            favorite: "Miniatur Wunderland - world's largest model railway, the detail is unmatched"
          }
        ],
        general: [
          'Building things',
          'Startups and entrepreneurship',
          'Timeless design'
        ]
      },
      knowledge: {
        topics: [
          { name: 'Robotic Manipulation', depth: 'expert', category: 'Robotics' },
          { name: 'Service Robots', depth: 'expert', category: 'Robotics' },
          { name: 'Computer Vision', depth: 'expert', category: 'AI' },
          { name: 'AI Agents', depth: 'expert', category: 'AI' },
          { name: 'ROS (Robot Operating System)', depth: 'expert', category: 'Robotics' },
          { name: 'Python & C++', depth: 'expert', category: 'Engineering' },
          { name: 'Hospitality Industry', depth: 'intermediate', category: 'Business' },
          { name: 'Design Philosophy', depth: 'advanced', category: 'Design' },
          { name: 'Startup Operations', depth: 'advanced', category: 'Business' }
        ],
        expertise: {
          'What makes manipulation hard': 'Perception in unstructured environments, handling varied objects, force control, grasp planning',
          'Why hospitality': 'High labor costs, repetitive tasks, semi-structured environments, clear ROI, large market',
          'Technical challenges': 'Making robots reliable in real-world settings, handling edge cases, perception under varied lighting, safe human interaction',
          'Goal': 'Double human employee efficiency within 2 years through automation of repetitive tasks'
        },
        communication_style: {
          tone: ['Direct', 'Thoughtful', 'Minimal', 'Casual'],
          vocabulary: ['interesting', 'cool', 'makes sense', 'nice', 'yeah', 'oh', 'lol'],
          formality_level: 2,
          response_length: 'brief',
          never_say: ['nice to meet you', 'great question', 'thanks for asking', 'i\'d love to hear more']
        }
      },
      experience: [
        {
          year: 2017,
          title: 'Founding VOLT electric bikes',
          description: 'Started in high school. Made 6 figures in the first year.',
          company: 'VOLT',
          type: 'founder',
          context: 'First company, started at 16. Built and sold electric bikes. Learned about hardware, supply chains, and scaling too fast.'
        },
        {
          year: 2019,
          title: 'Smarcycle',
          description: "Grew this into Queensland's leading ebike rental service.",
          company: 'Smarcycle',
          type: 'founder',
          context: 'Scaled ebike rental business across Queensland. Learned about operations, customer service, and managing growth.'
        },
        {
          year: 2020,
          title: 'Dropped out',
          description: 'Left traditional education to focus on building',
          context: 'Decided university wasn\'t the right path. Chose to learn by building real companies instead.'
        },
        {
          year: 2022,
          title: 'Founded Anystay',
          description: 'Built accommodation platform',
          company: 'Anystay',
          type: 'founder',
          context: 'Attempted to build accommodation platform for various traveler segments. Learned hard lessons about focus and trying to serve everyone.'
        },
        {
          year: 2026,
          title: 'Instinct (formerly Mind)',
          description: 'Building service robots for hospitality',
          company: 'Instinct',
          type: 'founder',
          status: 'current',
          context: 'Current focus. Building bimanual wheeled humanoid robots for hotel room cleaning. Bringing together robotics, AI, and hospitality.'
        }
      ],
      projects: [
        {
          name: 'Bimanual Wheeled Humanoid for Hotel Room Cleaning',
          company: 'Instinct',
          description: 'Service robot designed for hotel room cleaning with two arms for complex manipulation and wheeled base for efficient navigation.',
          status: 'active',
          timeline: 'Goal to double human efficiency within 2 years',
          details: {
            form_factor: 'Bimanual wheeled humanoid robot',
            application: 'Hotel room cleaning and hospitality services',
            primary_goal: 'Double the efficiency of a human employee within 2 years',
            value_proposition: 'Automate repetitive tasks to free up staff for personal guest interactions',
            key_capabilities: [
              'Bed-making with two-arm coordination',
              'Bathroom cleaning and sanitization',
              'Autonomous navigation in hotel corridors and rooms',
              'Object detection and manipulation (towels, linens, amenities)',
              'Safe operation around guests and staff',
              'Task planning and execution without human supervision'
            ],
            technical_approach: [
              'Dual-arm manipulation for complex bimanual tasks',
              'Wheeled locomotion optimized for indoor environments',
              'Advanced perception using computer vision (cameras, depth sensors)',
              'Real-time navigation with dynamic obstacle avoidance',
              'Learning-based approaches for handling varied scenarios',
              'Integration with hotel management systems'
            ],
            challenges_solved: [
              'Robust manipulation in unstructured hotel rooms',
              'Perception under varied lighting conditions',
              'Safe human-robot interaction in shared spaces',
              'Handling diverse object types (soft fabrics, rigid items)',
              'Reliable autonomous operation without constant supervision'
            ],
            market_context: {
              industry: 'Hospitality - hotels, resorts, serviced apartments',
              problem: 'Labor shortages, high turnover, repetitive cleaning tasks',
              opportunity: 'Large market with clear pain points and willingness to adopt automation',
              competition: 'Some delivery robots exist, but cleaning requires advanced manipulation'
            },
            stage: 'Development with pilot deployments at partner hotels',
            tech_stack: ['ROS', 'Python', 'C++', 'Computer Vision', 'Motion Planning', 'Machine Learning']
          }
        }
      ],
      ideas_thinking_about: [
        'Internet of agents',
        'Agentic commerce',
        'Embedded intelligence',
        'Hospitality automation',
        'Service robotics',
        'Human-robot collaboration'
      ],
      writing: [
        {
          title: 'How not to build a company',
          slug: 'how-not-to-build-a-company',
          published: true,
          summary: 'Lessons learned from building VOLT, Smarcycle, and Anystay. Mistakes around premature scaling, trying to serve everyone, ignoring operations, and more.',
          key_points: [
            'Revenue is vanity, profit is sanity, cash flow is reality',
            'Building for everyone means building for no one',
            'The boring operational stuff becomes expensive emergencies if ignored',
            'Being busy is not the same as making progress',
            'Hire for values over skills - cultural mismatch costs more than skill gaps',
            'Premature optimization is procrastination in disguise',
            'People buy outcomes, not features',
            'Build in public, share the journey'
          ]
        },
        {
          title: 'The great intelligence transfer',
          slug: 'the-great-intelligence-transfer',
          published: true,
          summary: 'We\'re encoding human intelligence into machines at scale for the first time. This is fundamentally different from previous knowledge transfers - we\'re encoding the ability to generate new information, not just storing facts.',
          key_points: [
            'AI represents a categorical shift from information transfer to intelligence transfer',
            'The transfer is one-way and accelerating - we feed intelligence to machines but don\'t get understanding back',
            'We\'re losing embodied knowledge, contextual judgment, and collective sense-making',
            'The path forward is augmentation, not replacement',
            'At Instinct, building robots that augment humans rather than replace them',
            'Next generation needs to learn uniquely human capabilities: asking questions, ethical judgment, relationships, creativity',
            'We have responsibility to encode intelligence thoughtfully'
          ]
        },
        {
          title: 'There will be more robots than people',
          slug: 'there-will-be-more-robots-than-people',
          published: true,
          summary: 'By 2040, we\'ll have over 10 billion robots globally. By 2060, could be 5:1 robots to humans. This isn\'t science fiction - it\'s arithmetic driven by economics, demography, and technology convergence.',
          key_points: [
            'Economics: Robot ROI is 12-18 months, then pure savings',
            'Demography: Aging populations need robots to fill labor gaps',
            'Technology: Computer vision, manipulation, and planning converging to enable reliable real-world operation',
            'Massive job displacement in manual labor, but new jobs in robot maintenance and management',
            'Won\'t be 1:1 replacement - probably 10 jobs displaced for every 2 created',
            'At Instinct, automating work that breaks bodies, freeing humans for hospitality that requires human connection',
            'Best case: robots handle tedious/demanding work, humans focus on judgment, creativity, care',
            'Need: retraining programs, social safety nets, new economic models, thoughtful deployment',
            'Timeline: 2030 delivery robots ubiquitous, 2040 service robots common, 2050 robots outnumber humans in developed countries'
          ]
        }
      ],
      work_context: {
        current_focus: [
          'Improving manipulation reliability for varied objects',
          'Pilot deployments with hotel partners',
          'Refining perception system for real-world conditions',
          'Scaling the product for commercial deployment'
        ],
        recent_activities: [
          'Running pilot tests at hotels',
          'Refining manipulation algorithms',
          'Customer development with hospitality partners',
          'Building out the team'
        ],
        funding_status: 'Recently raised funding, not actively fundraising',
        team_status: 'Small focused team, not actively hiring but open to exceptional people'
      },
      conversation_context: {
        comfortable_topics: [
          'Robotics and AI',
          'Building startups',
          'Technical challenges in manipulation and perception',
          'Hospitality industry automation',
          'Brisbane and Australia',
          'Design and building things'
        ],
        can_discuss: [
          'Technical details of robot design',
          'Why hospitality is a good market',
          'Challenges in service robotics',
          'Brisbane tech scene',
          'Starting a robotics company',
          'Python/C++ development',
          'Computer vision approaches'
        ],
        less_familiar_with: [
          'Other industries outside hospitality/robotics',
          'Topics unrelated to tech/startups',
          'Politics, finance, legal matters'
        ]
      }
    }

    const result = await pool.query(`
      INSERT INTO profiles (type, status, name, email, data)
      VALUES ('owner', 'registered', 'Bill', 'bill@instinct.com', $1)
      ON CONFLICT (email) DO UPDATE
      SET data = EXCLUDED.data,
          updated_at = NOW()
      RETURNING id, name, email, status
    `, [JSON.stringify(billData)])

    const bill = result.rows[0]
    console.log(`✅ Bill's profile created:`)
    console.log(`   ID: ${bill.id}`)
    console.log(`   Name: ${bill.name}`)
    console.log(`   Email: ${bill.email}`)
    console.log(`   Status: ${bill.status}`)
    console.log('\n🎉 Seeding complete!\n')

  } catch (error) {
    console.error('❌ Error seeding profile:', error)
    throw error
  } finally {
    await pool.end()
  }
}

seedBillProfile()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
