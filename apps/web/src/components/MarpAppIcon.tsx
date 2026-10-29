// The production icon, as GitHub shows the Marp app, whatever this build's channel.
import appIconUrl from "../../../../assets/prod/marp-black-web-apple-touch-180.png";

export function MarpAppIcon(props: { readonly className?: string }) {
  return <img src={appIconUrl} alt="" className={props.className} />;
}
