/** Example CSV with every supported column. */
export function GET() {
  const csv = [
    "name,description,price,category,stock,sku,size,color,photo_url,active",
    "Qora charm kurtka,Tabiiy charmdan qishki kurtka,890000,Kurtkalar,3,KRT-01,M,qora,,1",
    "Qora charm kurtka,Tabiiy charmdan qishki kurtka,890000,Kurtkalar,2,KRT-02,L,qora,,1",
    "Oq futbolka,100% paxta,129000,Futbolkalar,25,FT-01,,,,1",
  ].join("\r\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sotuvai-products-template.csv"',
    },
  });
}
