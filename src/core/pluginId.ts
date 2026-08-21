const NAMESPACE = "com.chong.hp-tracker";

/** Namespaced key for anything this extension writes into Owlbear Rodeo. */
export function getPluginId(path?: string): string {
  return path === undefined ? NAMESPACE : `${NAMESPACE}/${path}`;
}
