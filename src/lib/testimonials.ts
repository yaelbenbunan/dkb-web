export interface Testimonial {
  body: string;
  author: string;
  rating: number;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    body: "Es un placer trabajar con Irene y Yael! Profesionales, creativas, entusiastas y divertidas... no se puede pedir más. Han hecho nuestro proyecto suyo y son parte de nuestro equipo en el día a día. Gracias a Dinkbit y a sus grandes profesionales!",
    author: "Begoña Díaz Rivas",
    rating: 5,
  },
  {
    body: "Desde Dinkbit nos prestan un servicio excelente en la gestión de nuestra cuenta profesional en Linkedin. Queremos destacar su trato personal cercano, la eficiencia a la hora de ejecutar su trabajo y los buenos recursos de los que disponen.",
    author: "Crowe Legal y Tributario Andalucía",
    rating: 5,
  },
  {
    body: "He hecho mi web con ellos y ha quedado genial! Recomiendo en especial a Yael, el gusto y la paciencia que tiene es increíble.",
    author: "Blanca Vera",
    rating: 5,
  },
  {
    body: "Hicieron mi página web y el resultado ha sido muy bueno. Durante el proceso, el trato y el esfuerzo han sido notables. Ya las he recomendado a otra amiga que ha comenzado a realizar su página con ellas.",
    author: "Zamira Pasceri",
    rating: 5,
  },
];

export const GOOGLE_REVIEWS_URL =
  "https://www.google.com/maps/place/dinkbit/@40.4341993,-3.6757884,17z/data=!4m8!3m7!1s0xd4229e7421f93eb:0xdb6bb28af26c7246!8m2!3d40.4341952!4d-3.6732081!9m1!1b1!16s%2Fg%2F11fkrxqvzm";
