import React from 'react';
import {
  AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, Award, BarChart3, BookOpen, BookUser, Book,
  Briefcase, Calendar, CalendarCheck, CalendarDays, CalendarPlus, ChevronDown, ChevronLeft,
  ChevronRight, ChevronUp, ChevronsRight, Circle, CircleChevronRight, Clock, Coins,
  Compass, DoorOpen, Download, Earth, Eye, FileBadge, FileDown, FileSignature, FileSpreadsheet, FileText,
  FileType, FlaskConical, FolderOpen, Gavel, Globe, GraduationCap, Handshake, HandCoins, HandHeart,
  Hash, History, House, IdCard, Inbox, Info, Instagram, Landmark, Laptop, Layers, Link as LinkIcon,
  Linkedin, List, LoaderCircle, MapPin, Mail, Megaphone, Menu, MessageCircle, Newspaper, Network,
  Paperclip, PieChart, Pencil, PlaneTakeoff, Phone, Presentation, ScrollText, Search, ShieldCheck,
  Smartphone, Star, Stamp, Trash2, Twitter, User, UserCheck, UserCog, Users, UsersRound, X,
  Target as Bullseye, Chrome, Microscope, CircleHelp, Feather, FilePen, FileX, CheckCheck, Facebook, Youtube, Home, Check, Plus, Bell,
} from 'lucide-react';

// Um só sistema de ícones (Fase U.7): lucide. O banco ainda guarda, em menus,
// atalhos e redes sociais, classes do Font Awesome ("fa-solid fa-gavel") — o
// painel as gravou assim por meses —, então esta tabela aceita as duas formas:
//   <Icone nome="fa-solid fa-gavel" />   (valor antigo do banco)
//   <Icone nome="gavel" />               (forma curta, a que o painel oferece)
// A chave é o nome do Font Awesome sem o prefixo `fa-`.
const ICONES = {
  'house': House, 'home': Home,
  'circle-info': Info, 'info': Info,
  'users': Users, 'user': User, 'user-graduate': GraduationCap, 'user-tie': User, 'user-shield': ShieldCheck,
  'users-gear': UserCog, 'chalkboard-user': Presentation, 'chalkboard-teacher': Presentation,
  'people-arrows': UsersRound, 'address-card': IdCard, 'user-check': UserCheck,
  'flask': FlaskConical, 'door-open': DoorOpen, 'laptop-code': Laptop,
  'newspaper': Newspaper, 'bullhorn': Megaphone, 'scroll': ScrollText, 'file-signature': FileSignature,
  'file-lines': FileText, 'file-pdf': FileText, 'file-excel': FileSpreadsheet, 'file-csv': FileType,
  'file-arrow-down': FileDown, 'download': Download, 'paperclip': Paperclip, 'certificate': FileBadge,
  'folder-open': FolderOpen, 'book': Book, 'book-open': BookOpen, 'book-open-reader': BookOpen,
  'graduation-cap': GraduationCap, 'landmark': Landmark, 'gavel': Gavel, 'stamp': Stamp,
  'calendar': Calendar, 'calendar-days': CalendarDays, 'calendar-plus': CalendarPlus, 'calendar-check': CalendarCheck,
  'clock': Clock, 'clock-rotate-left': History,
  'envelope': Mail, 'phone': Phone, 'mobile-screen': Smartphone, 'location-dot': MapPin,
  'globe': Globe, 'earth-americas': Earth, 'link': LinkIcon,
  'whatsapp': MessageCircle, 'instagram': Instagram, 'linkedin-in': Linkedin, 'linkedin': Linkedin,
  'twitter': Twitter, 'facebook': Facebook, 'youtube': Youtube, 'google': Chrome, 'orcid': BookUser,
  'magnifying-glass': Search, 'search': Search, 'eye': Eye, 'pen-to-square': Pencil, 'trash-can': Trash2,
  'chevron-right': ChevronRight, 'chevron-left': ChevronLeft, 'chevron-down': ChevronDown, 'chevron-up': ChevronUp,
  'angle-right': ChevronRight, 'circle-chevron-right': CircleChevronRight, 'chevrons-right': ChevronsRight,
  'arrow-left': ArrowLeft, 'arrow-right': ArrowRight, 'xmark': X, 'bars': Menu, 'check': Check, 'plus': Plus,
  'circle-exclamation': AlertCircle, 'triangle-exclamation': AlertTriangle, 'circle-notch': LoaderCircle,
  'circle': Circle, 'star': Star, 'bullseye': Bullseye, 'compass': Compass, 'hashtag': Hash, 'bell': Bell,
  'list': List, 'layer-group': Layers, 'sitemap': Network, 'inbox': Inbox, 'menu': Menu,
  'chart-column': BarChart3, 'chart-pie': PieChart, 'coins': Coins, 'hand-holding-dollar': HandCoins,
  'hands-holding-child': HandHeart, 'handshake': Handshake, 'briefcase': Briefcase, 'passport': IdCard,
  'facebook-f': Facebook, 'id-card': IdCard, 'user-gear': UserCog, 'check-double': CheckCheck,
  'circle-question': CircleHelp, 'microscope': Microscope, 'file-alt': FileText, 'people-group': UsersRound,
  'feather': Feather, 'file-pen': FilePen, 'file-circle-xmark': FileX,
  'plane-departure': PlaneTakeoff, 'award': Award, 'shield-check': ShieldCheck,
};

// Nomes para o seletor do painel (rótulo em português). Só o que faz sentido
// como ícone de atalho/menu; as chaves existem em ICONES.
export const ICONES_ESCOLHA = [
  ['link', 'Link'], ['house', 'Casa'], ['circle-info', 'Informação'], ['newspaper', 'Notícia'],
  ['bullhorn', 'Comunicado'], ['scroll', 'Resolução'], ['file-lines', 'Documento'], ['file-signature', 'Formulário'],
  ['folder-open', 'Pasta'], ['book-open', 'Livro'], ['graduation-cap', 'Formatura'], ['landmark', 'Instituição'],
  ['gavel', 'Martelo'], ['stamp', 'Carimbo'], ['calendar-days', 'Calendário'], ['clock', 'Relógio'],
  ['envelope', 'E-mail'], ['phone', 'Telefone'], ['location-dot', 'Local'], ['globe', 'Globo'],
  ['users', 'Pessoas'], ['user', 'Pessoa'], ['flask', 'Pesquisa'], ['door-open', 'Admissão'],
  ['chart-column', 'Gráfico'], ['coins', 'Bolsa/dinheiro'], ['handshake', 'Parceria'], ['briefcase', 'Trabalho'],
  ['plane-departure', 'Mobilidade'], ['passport', 'Passaporte'], ['certificate', 'Certificado'], ['download', 'Download'],
  ['magnifying-glass', 'Busca'], ['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['linkedin', 'LinkedIn'],
  ['youtube', 'YouTube'], ['facebook', 'Facebook'], ['twitter', 'X / Twitter'],
];

// "fa-solid fa-gavel" | "fa-gavel" | "gavel" → "gavel". Sobra só o último
// nome (o resto são prefixos de estilo e modificadores).
const PREFIXOS_FA = new Set(['fa-solid', 'fa-regular', 'fa-brands', 'fa-fw', 'fa-spin', 'fa']);
export function chaveDoIcone(nome) {
  const tokens = String(nome || '').trim().split(/\s+/).filter((t) => t && !PREFIXOS_FA.has(t));
  const ultimo = tokens[tokens.length - 1] || '';
  return ultimo.replace(/^fa-/, '');
}

export const iconeExiste = (nome) => !!ICONES[chaveDoIcone(nome)];

// Ícone decorativo por padrão (aria-hidden): quem precisa de nome acessível usa
// `titulo`. Dimensiona pela fonte (1em), como o Font Awesome fazia, então as
// classes `text-xl`, `text-[15rem]` etc. das telas continuam valendo, e herda a
// cor do texto — nada muda no contraste das cores do programa (Fase S.5).
export default function Icone({ nome, className = '', titulo, spin, ...resto }) {
  const chave = chaveDoIcone(nome);
  const Componente = ICONES[chave] || LinkIcon;
  const gira = spin || String(nome || '').includes('fa-spin');
  return (
    <Componente
      width="1em"
      height="1em"
      className={`inline-block shrink-0 align-[-0.125em] ${gira ? 'animate-spin' : ''} ${className}`}
      aria-hidden={titulo ? undefined : 'true'}
      role={titulo ? 'img' : undefined}
      aria-label={titulo || undefined}
      focusable="false"
      {...resto}
    />
  );
}
