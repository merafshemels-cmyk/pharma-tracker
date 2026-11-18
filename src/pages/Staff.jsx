import { useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext'
import { usePreferences } from '../context/PreferencesContext'
import {
  ROLES,
  canManageStaff,
  normalizeRole,
  roleLabelKey,
} from '../utils/roles'

const STATUS_KEYS = {
  active: 'staff.active',
  inactive: 'staff.inactive',
  invited: 'staff.invited',
}

// Owner-only screen. The route guard hides it from cashiers and the database
// rejects membership writes from non-owners.
function Staff() {
  const { members, profile, role, updateMember } = useWorkspace()
  const { t } = usePreferences()
  const [notice, setNotice] = useState(null)
  const [busyId, setBusyId] = useState('')
  const canManage = canManageStaff(role)

  async function handleChange(member, updates) {
    setBusyId(member.id)
    setNotice(null)
    try {
      await updateMember(member.id, updates)
      setNotice({
        type: 'success',
        message: t('staff.updated', {
          name: member.name || t('staff.memberFallback'),
        }),
      })
    } catch (error) {
      setNotice({
        type: 'error',
        message: error.message || t('staff.updateError'),
      })
    } finally {
      setBusyId('')
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('staff.title')}</h1>
          <p className="page-sub">{t('staff.subtitle')}</p>
        </div>
      </div>

      {notice && (
        <div className={`notice notice-${notice.type}`} role="status">
          {notice.message}
        </div>
      )}

      <section className="panel" aria-labelledby="staff-title">
        <div className="panel-head panel-head-wrap">
          <div>
            <h2 id="staff-title">{t('staff.members')}</h2>
            <p className="panel-sub">
              {t('staff.memberCount', { count: members.length })}
            </p>
          </div>
        </div>

        {members.length === 0 ? (
          <div className="empty-state">{t('staff.empty')}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('staff.member')}</th>
                  <th scope="col">{t('staff.phone')}</th>
                  <th scope="col">{t('staff.role')}</th>
                  <th scope="col">{t('staff.status')}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isSelf = profile?.id && profile.id === member.userId
                  const roleValue = normalizeRole(member.role)
                  const legacyRole =
                    member.role !== roleValue ? member.role : ''

                  return (
                    <tr key={member.id}>
                      <td>
                        <span className="strong">
                          {member.name || t('staff.unnamed')}
                        </span>
                        {isSelf && (
                          <span className="cell-sub">{t('staff.you')}</span>
                        )}
                        {legacyRole && (
                          <span className="cell-sub">
                            {t('staff.legacyRole', { role: legacyRole })}
                          </span>
                        )}
                      </td>
                      <td className="muted">
                        {member.phone || t('common.unknown')}
                      </td>
                      <td>
                        {canManage && !isSelf ? (
                          <select
                            aria-label={t('staff.roleAria', {
                              name: member.name || t('staff.memberFallback'),
                            })}
                            value={roleValue}
                            disabled={busyId === member.id}
                            onChange={(event) =>
                              handleChange(member, { role: event.target.value })
                            }
                          >
                            {ROLES.map((value) => (
                              <option key={value} value={value}>
                                {t(roleLabelKey(value))}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="status is-ok">
                            {t(roleLabelKey(roleValue))}
                          </span>
                        )}
                      </td>
                      <td>
                        {canManage && !isSelf ? (
                          <select
                            aria-label={t('staff.statusAria', {
                              name: member.name || t('staff.memberFallback'),
                            })}
                            value={member.status}
                            disabled={busyId === member.id}
                            onChange={(event) =>
                              handleChange(member, {
                                status: event.target.value,
                              })
                            }
                          >
                            <option value="active">{t('staff.active')}</option>
                            <option value="inactive">{t('staff.inactive')}</option>
                          </select>
                        ) : (
                          <span className="muted">
                            {STATUS_KEYS[member.status]
                              ? t(STATUS_KEYS[member.status])
                              : member.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="panel-note">{t('staff.note')}</p>
      </section>
    </>
  )
}

export default Staff
