import { requireSupabase } from '../lib/supabaseClient.js'

export class BaseRepository {
  constructor(table) {
    this.table = table
  }

  client() {
    return requireSupabase()
  }

  from() {
    return this.client().from(this.table)
  }
}
