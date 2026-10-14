import { FormEvent, useEffect, useState } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  difficulty: string;
  status: string;
  source: string;
};

type Template = {
  id: string;
  name: string;
  description: string;
  status: string;
  version: number;
  exercises: Array<{ exerciseId: string; sets: number; targetReps: number; restSeconds: number }>;
};

type AdminUser = { id: string; email: string; roles: string[]; status: string };
const adminRoles = ['content_editor', 'content_reviewer', 'content_admin'] as const;
type MediaAsset = {
  id: string;
  exerciseId: string;
  uri: string;
  source: string;
  sourceId: string;
  license: string;
  attribution: string;
  distributionScope: 'personal' | 'public';
  reviewStatus: 'pending' | 'approved' | 'rejected';
  version: number;
};
type AuditEvent = {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeVersion: number | null;
  afterVersion: number | null;
  createdAt: string;
};

const json = async <T,>(url: string, token: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? '请求失败。');
  }
  return response.json() as Promise<T>;
};

const App = () => {
  const [section, setSection] = useState<'exercises' | 'templates' | 'media' | 'users' | 'audit'>('exercises');
  const [token, setToken] = useState(() => sessionStorage.getItem('admin-token') ?? '');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [error, setError] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editExerciseName, setEditExerciseName] = useState('');
  const [editMuscleGroup, setEditMuscleGroup] = useState('');
  const [editEquipment, setEditEquipment] = useState('');
  const [editDifficulty, setEditDifficulty] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateName, setEditTemplateName] = useState('');
  const [editTemplateDescription, setEditTemplateDescription] = useState('');
  const [editTemplateExercises, setEditTemplateExercises] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserRoles, setEditUserRoles] = useState<string[]>([]);
  const [mediaExerciseId, setMediaExerciseId] = useState('');
  const [mediaUri, setMediaUri] = useState('');
  const [mediaSource, setMediaSource] = useState('');
  const [mediaSourceId, setMediaSourceId] = useState('');
  const [mediaLicense, setMediaLicense] = useState('');
  const [mediaAttribution, setMediaAttribution] = useState('');
  const [mediaScope, setMediaScope] = useState<'personal' | 'public'>('public');

  const load = async () => {
    setError('');
    try {
      const [exerciseResult, templateResult, userResult, auditResult, mediaResult] = await Promise.allSettled([
        json<{ items: Exercise[] }>('/admin/exercises', token),
        json<{ items: Template[] }>('/admin/templates', token),
        json<{ items: AdminUser[] }>('/admin/users', token),
        json<{ items: AuditEvent[] }>('/admin/audit-events', token),
        json<{ items: MediaAsset[] }>('/admin/media', token),
      ]);
      if (exerciseResult.status === 'fulfilled') setExercises(exerciseResult.value.items);
      if (templateResult.status === 'fulfilled') setTemplates(templateResult.value.items);
      if (userResult.status === 'fulfilled') setUsers(userResult.value.items);
      if (auditResult.status === 'fulfilled') setAuditEvents(auditResult.value.items);
      if (mediaResult.status === 'fulfilled') setMedia(mediaResult.value.items);
      const failures = [exerciseResult, templateResult, userResult, auditResult]
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failures.length === 4) {
        throw failures[0].reason;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '加载失败。');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createExercise = async (event: FormEvent) => {
    event.preventDefault();
    if (!exerciseName.trim()) return;
    await json('/admin/exercises', token, {
      method: 'POST',
      body: JSON.stringify({
        name: exerciseName,
        muscleGroup: '待分类',
        equipment: '待配置',
        difficulty: '待配置',
        instruction: '待补充',
        source: 'admin',
        sourceId: `admin-${Date.now()}`,
        license: '待审核',
      }),
    });
    setExerciseName('');
    await load();
  };

  const startExerciseEdit = (exercise: Exercise) => {
    setEditingExerciseId(exercise.id);
    setEditExerciseName(exercise.name);
    setEditMuscleGroup(exercise.muscleGroup);
    setEditEquipment(exercise.equipment);
    setEditDifficulty(exercise.difficulty);
  };

  const saveExercise = async (event: FormEvent, id: string) => {
    event.preventDefault();
    await json(`/admin/exercises/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({
        name: editExerciseName,
        muscleGroup: editMuscleGroup,
        equipment: editEquipment,
        difficulty: editDifficulty,
      }),
    });
    setEditingExerciseId(null);
    await load();
  };

  const createTemplate = async (event: FormEvent) => {
    event.preventDefault();
    if (!templateName.trim()) return;
    await json('/admin/templates', token, {
      method: 'POST',
      body: JSON.stringify({
        name: templateName,
        description: '待补充',
        exercises: [{ exerciseId: 'placeholder', sets: 3, targetReps: 8, restSeconds: 90 }],
      }),
    });
    setTemplateName('');
    await load();
  };

  const transition = async (kind: 'exercises' | 'templates', id: string, status: string) => {
    await json(`/admin/${kind}/${id}/status`, token, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const startTemplateEdit = (template: Template) => {
    setEditingTemplateId(template.id);
    setEditTemplateName(template.name);
    setEditTemplateDescription(template.description);
    setEditTemplateExercises(JSON.stringify(template.exercises, null, 2));
  };

  const saveTemplate = async (event: FormEvent, id: string) => {
    event.preventDefault();
    let exercises: Template['exercises'];
    try {
      exercises = JSON.parse(editTemplateExercises) as Template['exercises'];
    } catch {
      setError('动作配置必须是合法 JSON。');
      return;
    }
    await json(`/admin/templates/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({
        name: editTemplateName,
        description: editTemplateDescription,
        exercises,
      }),
    });
    setEditingTemplateId(null);
    await load();
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!userEmail.trim()) return;
    await json('/admin/users', token, {
      method: 'POST',
      body: JSON.stringify({ email: userEmail, roles: ['content_editor'] }),
    });
    setUserEmail('');
    await load();
  };

  const updateUserStatus = async (id: string, status: string) => {
    await json(`/admin/users/${id}/status`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const saveUserRoles = async (id: string) => {
    if (!editUserRoles.length) return;
    await json(`/admin/users/${id}/roles`, token, {
      method: 'PATCH',
      body: JSON.stringify({ roles: editUserRoles }),
    });
    setEditingUserId(null);
    await load();
  };

  const createMedia = async (event: FormEvent) => {
    event.preventDefault();
    if (!mediaExerciseId.trim() || !mediaUri.trim()) return;
    await json('/admin/media', token, {
      method: 'POST',
      body: JSON.stringify({
        exerciseId: mediaExerciseId,
        uri: mediaUri,
        source: mediaSource,
        sourceId: mediaSourceId,
        license: mediaLicense,
        attribution: mediaAttribution,
        distributionScope: mediaScope,
      }),
    });
    setMediaExerciseId('');
    setMediaUri('');
    setMediaSource('');
    setMediaSourceId('');
    setMediaLicense('');
    setMediaAttribution('');
    await load();
  };

  const transitionMedia = async (id: string, status: MediaAsset['reviewStatus']) => {
    await json(`/admin/media/${id}/status`, token, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    await load();
  };

  return (
    <main className="shell">
      <aside className="sidebar">
        <strong>Fitness Tracker</strong>
        <p className="sidebar-caption">公共内容管理</p>
        <nav aria-label="后台导航">
          <button className={section === 'exercises' ? 'active' : ''} onClick={() => setSection('exercises')}>
            动作库
          </button>
          <button className={section === 'templates' ? 'active' : ''} onClick={() => setSection('templates')}>
            公共模板
          </button>
          <button className={section === 'media' ? 'active' : ''} onClick={() => setSection('media')}>
            媒体授权
          </button>
          <button className={section === 'users' ? 'active' : ''} onClick={() => setSection('users')}>
            管理员
          </button>
          <button className={section === 'audit' ? 'active' : ''} onClick={() => setSection('audit')}>
            审计日志
          </button>
        </nav>
      </aside>
      <section className="content">
        <div className="auth-bar">
          <input aria-label="管理员 Bearer Token" value={token} onChange={(event) => setToken(event.target.value)} placeholder="粘贴管理员 Bearer Token" />
          <button className="secondary" onClick={() => { sessionStorage.setItem('admin-token', token); void load(); }}>连接</button>
          <button className="secondary" onClick={() => { sessionStorage.removeItem('admin-token'); setToken(''); }}>退出</button>
        </div>
        <header className="page-header">
          <div>
            <p className="eyebrow">内容工作台</p>
            <h1>{section === 'exercises' ? '动作库' : section === 'templates' ? '公共模板' : section === 'media' ? '媒体授权' : section === 'users' ? '管理员' : '审计日志'}</h1>
          </div>
          <button className="secondary" onClick={() => void load()}>刷新</button>
        </header>
        {error && <p className="error" role="alert">{error}</p>}
        {section === 'exercises' ? (
          <>
            <form className="create-form" onSubmit={(event) => void createExercise(event)}>
              <input aria-label="动作名称" value={exerciseName} onChange={(event) => setExerciseName(event.target.value)} placeholder="新增动作名称" />
              <button type="submit">创建动作</button>
            </form>
            <div className="list" aria-label="动作列表">
              {exercises.map((exercise) => (
                <article className="item" key={exercise.id}>
                  {editingExerciseId === exercise.id ? (
                    <form className="edit-form" onSubmit={(event) => void saveExercise(event, exercise.id)}>
                      <input aria-label="编辑动作名称" value={editExerciseName} onChange={(event) => setEditExerciseName(event.target.value)} />
                      <input aria-label="编辑肌群" value={editMuscleGroup} onChange={(event) => setEditMuscleGroup(event.target.value)} />
                      <input aria-label="编辑器械" value={editEquipment} onChange={(event) => setEditEquipment(event.target.value)} />
                      <input aria-label="编辑难度" value={editDifficulty} onChange={(event) => setEditDifficulty(event.target.value)} />
                      <div className="item-actions"><button type="submit">保存</button><button type="button" onClick={() => setEditingExerciseId(null)}>取消</button></div>
                    </form>
                  ) : (
                    <>
                      <div><h2>{exercise.name}</h2><p>{exercise.muscleGroup} · {exercise.equipment} · {exercise.source}</p></div>
                      <div className="item-actions"><span className={`badge ${exercise.status}`}>{exercise.status}</span>{(exercise.status === 'draft' || exercise.status === 'review') && <button onClick={() => startExerciseEdit(exercise)}>编辑</button>}{exercise.status === 'draft' && <button onClick={() => void transition('exercises', exercise.id, 'review')}>提交审核</button>}{exercise.status === 'review' && <button onClick={() => void transition('exercises', exercise.id, 'published')}>发布</button>}</div>
                    </>
                  )}
                </article>
              ))}
              {!exercises.length && <p className="muted">暂无动作。</p>}
            </div>
          </>
        ) : section === 'templates' ? (
          <>
            <form className="create-form" onSubmit={(event) => void createTemplate(event)}>
              <input aria-label="模板名称" value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="新增公共模板名称" />
              <button type="submit">创建模板</button>
            </form>
            <div className="list" aria-label="模板列表">
              {templates.map((template) => (
                <article className="item" key={template.id}>
                  {editingTemplateId === template.id ? (
                    <form className="edit-form template-edit-form" onSubmit={(event) => void saveTemplate(event, template.id)}>
                      <input aria-label="编辑模板名称" value={editTemplateName} onChange={(event) => setEditTemplateName(event.target.value)} />
                      <textarea aria-label="编辑模板描述" value={editTemplateDescription} onChange={(event) => setEditTemplateDescription(event.target.value)} />
                      <textarea aria-label="编辑模板动作配置" value={editTemplateExercises} onChange={(event) => setEditTemplateExercises(event.target.value)} />
                      <div className="item-actions"><button type="submit">保存</button><button type="button" onClick={() => setEditingTemplateId(null)}>取消</button></div>
                    </form>
                  ) : (
                    <>
                      <div><h2>{template.name}</h2><p>{template.exercises.length} 个动作 · v{template.version}</p></div>
                      <div className="item-actions"><span className={`badge ${template.status}`}>{template.status}</span>{(template.status === 'draft' || template.status === 'review') && <button onClick={() => startTemplateEdit(template)}>编辑</button>}{template.status === 'draft' && <button onClick={() => void transition('templates', template.id, 'review')}>提交审核</button>}{template.status === 'review' && <button onClick={() => void transition('templates', template.id, 'published')}>发布</button>}</div>
                    </>
                  )}
                </article>
              ))}
              {!templates.length && <p className="muted">暂无公共模板。</p>}
            </div>
          </>
        ) : section === 'media' ? (
          <>
            <form className="create-form media-form" onSubmit={(event) => void createMedia(event)}>
              <input aria-label="媒体关联动作 ID" value={mediaExerciseId} onChange={(event) => setMediaExerciseId(event.target.value)} placeholder="动作 ID" />
              <input aria-label="媒体 URI" value={mediaUri} onChange={(event) => setMediaUri(event.target.value)} placeholder="媒体 URI" />
              <input aria-label="媒体来源" value={mediaSource} onChange={(event) => setMediaSource(event.target.value)} placeholder="来源" />
              <input aria-label="媒体来源 ID" value={mediaSourceId} onChange={(event) => setMediaSourceId(event.target.value)} placeholder="来源 ID" />
              <input aria-label="媒体许可证" value={mediaLicense} onChange={(event) => setMediaLicense(event.target.value)} placeholder="许可证" />
              <input aria-label="媒体署名" value={mediaAttribution} onChange={(event) => setMediaAttribution(event.target.value)} placeholder="署名" />
              <select aria-label="分发范围" value={mediaScope} onChange={(event) => setMediaScope(event.target.value as 'personal' | 'public')}>
                <option value="public">公共分发</option>
                <option value="personal">个人使用</option>
              </select>
              <button type="submit">登记媒体</button>
            </form>
            <div className="list" aria-label="媒体列表">
              {media.map((asset) => (
                <article className="item" key={asset.id}>
                  <div><h2>{asset.exerciseId}</h2><p>{asset.source} · {asset.license} · {asset.distributionScope} · v{asset.version}</p><p className="muted">{asset.uri}</p></div>
                  <div className="item-actions"><span className={`badge ${asset.reviewStatus}`}>{asset.reviewStatus}</span>{asset.reviewStatus === 'pending' && asset.distributionScope === 'public' && <button onClick={() => void transitionMedia(asset.id, 'approved')}>批准</button>}{asset.reviewStatus === 'pending' && <button onClick={() => void transitionMedia(asset.id, 'rejected')}>拒绝</button>}{asset.reviewStatus === 'approved' && <button onClick={() => void transitionMedia(asset.id, 'pending')}>撤回</button>}</div>
                </article>
              ))}
              {!media.length && <p className="muted">暂无媒体登记。</p>}
            </div>
          </>
        ) : section === 'users' ? (
          <>
            <form className="create-form" onSubmit={(event) => void createUser(event)}>
              <input aria-label="管理员邮箱" type="email" value={userEmail} onChange={(event) => setUserEmail(event.target.value)} placeholder="新增管理员邮箱" />
              <button type="submit">创建管理员</button>
            </form>
            <div className="list" aria-label="管理员列表">
              {users.map((user) => (
                <article className="item" key={user.id}>
                  {editingUserId === user.id ? (
                    <div className="edit-form">
                      <h2>{user.email}</h2>
                      <div className="role-list">
                        {adminRoles.map((role) => (
                          <label key={role}>
                            <input type="checkbox" checked={editUserRoles.includes(role)} onChange={(event) => setEditUserRoles((current) => event.target.checked ? [...new Set([...current, role])] : current.filter((item) => item !== role))} />
                            {role}
                          </label>
                        ))}
                      </div>
                      <div className="item-actions"><button onClick={() => void saveUserRoles(user.id)}>保存权限</button><button type="button" onClick={() => setEditingUserId(null)}>取消</button></div>
                    </div>
                  ) : (
                    <>
                      <div><h2>{user.email}</h2><p>{user.roles.join('、')}</p></div>
                      <div className="item-actions"><span className={`badge ${user.status}`}>{user.status}</span><button onClick={() => { setEditingUserId(user.id); setEditUserRoles(user.roles); }}>编辑权限</button><button onClick={() => void updateUserStatus(user.id, user.status === 'active' ? 'disabled' : 'active')}>{user.status === 'active' ? '停用' : '启用'}</button></div>
                    </>
                  )}
                </article>
              ))}
              {!users.length && <p className="muted">暂无管理员。</p>}
            </div>
          </>
        ) : (
          <div className="list" aria-label="审计日志列表">
            {auditEvents.map((event, index) => (
              <article className="item" key={`${event.createdAt}-${event.resourceId}-${index}`}>
                <div><h2>{event.action}</h2><p>{event.resourceType} · {event.resourceId} · 操作者 {event.actorId}</p></div>
                <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString('zh-CN')}</time>
              </article>
            ))}
            {!auditEvents.length && <p className="muted">暂无审计记录。</p>}
          </div>
        )}
      </section>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
